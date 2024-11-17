import express, { response } from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import cors from 'cors';
import { APICallReturn, STORAGE_TYPE, ContractApp } from "./types/types";
import { apiCallWrapper } from "./utils/utils";
import fs from "fs";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import type { ChatPromptTemplate } from "@langchain/core/prompts";

import { pull } from "langchain/hub";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import * as ethers from "ethers";
// import { invokeLLM } from "./agents/appAgent";
import NFT_CONTRACT_ABI from "./NFTABI";

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

// Configure OpenAI API
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Ensure your OpenAI API key is in the .env file
  });


let EXTRACT_PARAMS_SYSTEM_PROMPT = fs.readFileSync("./prompts/extract_params.txt", "utf8");
let EXTRACT_PROJECT_ID_SYSTEM_PROMPT = fs.readFileSync("./prompts/extract_project_id.txt", "utf8");
let EXTRACT_SUBNET_SYSTEM_PROMPT = fs.readFileSync("./prompts/extract_subnet.txt", "utf8");

interface Message {
    role: "assistant" | "assistant-hidden" | "user" | "system" | "tool";
    content: string;
}

interface ModelMessage {
    role: "assistant" | "user" | "system";
    content: string;
    name?: string;
}

interface AppParams {
    appName: string;
    image: string;
    httpPort: number;
    timeDuration: number;
}

interface ReturnParams {
    projectID: string;
    appName: string;
    image: string;
    httpPort: number;
    timeDuration: number;
    questions: string;
}

interface AgentState {
    messages: Message[];
    curNode: string;
    state: {
        projectID: string;
        appParams: AppParams;
    };
    continue?: boolean;
}

const AIMessage = (content: string): Message => ({role: "assistant", content: content});
const ToolsMessage = (toolName: string, content: string): Message => ({role: "tool", content: JSON.stringify({toolName: toolName, content: content})});
const AIHiddenMessage = (content: string): Message => ({role: "assistant-hidden", content: content});
const UserMessage = (content: string): Message => ({role: "user", content: content});
const SystemMessage = (content: string): Message => ({role: "system", content: content});

const callOpenAI = async (system: string, input: string, agentState: AgentState): Promise<APICallReturn<AgentState>> => {
    console.log("conversation history: ", agentState.messages.map((mesg) => mesg.content).join("\n"));
    
    const prompts: ModelMessage[] = [
        {role: "system", content: "Conversation history: " + agentState.messages.map((mesg) => mesg.content).join("\n")},
        { role: "system", content: system },
        { role: "user", content: input }
    ]
    const response = await apiCallWrapper<OpenAI.Chat.Completions.ChatCompletion, string>(openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: prompts
    }), (res) => res.choices[0].message.content);


    if(response.success == false) {
        return {
            success: false,
            data: response.data
        };
    }

    return {
        success: true,
        data: {
            ...agentState,
            messages: [...agentState.messages, ...prompts, AIHiddenMessage(response.data)],
        }
    };
}

// const extractProjectID = async (input: string,agentState: AgentState): Promise<APICallReturn<string>> => {
//     const system = EXTRACT_PROJECT_ID_SYSTEM_PROMPT;
//     const resp = await callOpenAI(system, input, agentState);
//     return resp;
// }

const extractParams = async (input: string, inputState: AgentState): Promise<APICallReturn<{state: AgentState, params: ReturnParams}>> => {
    const system = EXTRACT_PARAMS_SYSTEM_PROMPT;
    const resp = await callOpenAI(system, input, inputState);
    if(resp.success == true) {
        const lastMessage = resp.data.messages[resp.data.messages.length - 1];
        console.log("extractParams lastMessage: ", lastMessage);
        return {
            success: true,
            data: {
                state: resp.data,
                params: JSON.parse(lastMessage.content)
            }
        };
    }
    return resp;
}


const validateParams = (params: AppParams): APICallReturn<string> => {
    if(params.appName.length > 32) {
        return {
            success: false,
            data: new Error("App name should not exceed more than 32 bytes")
        };
    }
    if(!params.appName.match(/^[a-z]+[a-z0-9]*$/)) {
        return {
            success: false,
            data: new Error("App name should only contain alphabets and numbers")
        };
    }
    if(params.httpPort < 1 || params.httpPort > 65535) {
        return {
            success: false,
            data: new Error("Http port should be between 1 and 65535")
        };
    }
    if(!params.image.match("^([a-z0-9]+([._-][a-z0-9]+)*/)*[a-z0-9]+([._-][a-z0-9]+)*(:[a-zA-Z0-9._-]+)?(@[A-Za-z0-9]+:[A-Fa-f0-9]+)?$")) {
        return {
            success: false,
            data: new Error("Invalid image format")
        };
    }
    return {
        success: true,
        data: "Valid parameters"
    };
}

const confirmParams = async (userInput: string, agentState: AgentState): Promise<APICallReturn<{state: AgentState}>> => {
    const resp = await callOpenAI("Analyze the user input for positive confirmation, and just return yes or no, and give reason. userInput: " + userInput, "", agentState);
    console.log("confirmResp: ", resp);
    if(resp.success == false) return resp;
    agentState = resp.data;

    const lastMessage = agentState.messages[agentState.messages.length - 1];
    
    console.log("lastMessage: ", lastMessage);
    if(lastMessage.content.toLowerCase() === 'yes') {
        return {
            success: true,
            data: {
                state: {...agentState, messages: [...agentState.messages, AIMessage("Deploying app."),], curNode: "DEPLOY_APP"}
            }
        };
    }
    else {
        return {
            success: true,
            data: {
                state: {...agentState, messages: [...agentState.messages, AIMessage("Any corrections to be made?")], curNode: "START"}
            }
        };
    }
}


const getOwnedNFTs = async (agentState: AgentState): Promise<APICallReturn<AgentState>> => {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL!);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const nftContract = new ethers.Contract("0xE72A418E1fa757D835c6ab1C7Cca074173a2Ca96", NFT_CONTRACT_ABI, wallet);
    const balance = await nftContract.balanceOf(process.env.USER_ADDRESS!);

    const ownedNFTsList = [];
    for(let i = 0; i < balance; i++) {
        const ownedNFTs = await nftContract.getTokenOfOwnerByIndex(process.env.USER_ADDRESS!, i);
        ownedNFTsList.push(ownedNFTs);
    }

    const nftWithMetadataList = []
    for(let i = 0; i < ownedNFTsList.length; i++) {
        const nftWithMetadata = await nftContract.tokenURI(ownedNFTsList[i]);
        // nftWithMetadataList.push({nftID: ownedNFTsList[i], metadata: nftWithMetadata});
        nftWithMetadataList.push(`${ownedNFTsList[i]}:- ${nftWithMetadata}`)
    }
    
    return {
        success: true,
        data: {...agentState, messages: [...agentState.messages, ToolsMessage("nft-owned", JSON.stringify(nftWithMetadataList))]}
    }
}

const callTool = async (toolName: string, toolFunc: () => Promise<any>, agentState: AgentState): Promise<APICallReturn<AgentState>> => {
    const resp = await apiCallWrapper<any, any>(toolFunc(), (res) => res);
    console.log("callTool resp: ", resp);
    if(resp.success == false) {
        return {
            success: false,
            data: resp.data
        }
    }
    return {
        success: true,
        data: {...agentState, messages: [...agentState.messages, ToolsMessage(toolName, resp.data)]}
    }
}

const purchaseNFT = async (userInput: string, agentState: AgentState): Promise<APICallReturn<AgentState>> => {
    const resp = await callOpenAI("Extract the nftID from the user input, and return only the {nftID}", userInput, agentState);
    if(resp.success == false) return resp;
    agentState = resp.data;

    const lastMessage = agentState.messages[agentState.messages.length - 1];
    const nftIDObj = JSON.parse(lastMessage.content);
    console.log("nftIDObj: ", nftIDObj);
    const nftID = nftIDObj.nftID;

    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL!);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const nftContract = new ethers.Contract("0xE72A418E1fa757D835c6ab1C7Cca074173a2Ca96", NFT_CONTRACT_ABI, wallet);
    console.log("ai address: ", process.env.AI_ADDRESS!);
    console.log("user address: ", process.env.USER_ADDRESS!);
    console.log("nftID: ", nftID);
    const tx = await callTool("nft-purchase", async () => {
        const tx =  await nftContract.transferFrom(process.env.AI_ADDRESS!, process.env.USER_ADDRESS!, nftID);
        await tx.wait();
        return {
            success: true,
            data: "NFT purchased successfully. Here is the transaction hash: " + tx.hash
        }
    }, agentState);
    
    return tx;
}

async function runNFTSearch(userInput: string, agentState: AgentState): Promise<APICallReturn<AgentState>> {
    const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
          // model: 'multilingual-e5-large',
      });

      const pinecone = new PineconeClient();
    // Will automatically read the PINECONE_API_KEY and PINECONE_ENVIRONMENT env vars
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    //   namespace: "ns1",
    // Maximum number of batch requests to allow at once. Each batch is 1000 vectors.
    maxConcurrency: 5,
    // You can pass a namespace here too
    // namespace: "foo",
    });

    const similaritySearchResults = await vectorStore.similaritySearch(
    userInput,
    2,
    );

    console.log("similaritySearchResults: ", similaritySearchResults);

    const results = []
    for (const doc of similaritySearchResults) {
        const nftMetadata = JSON.parse(doc.pageContent);
        const nftID = doc.metadata.id.substring(doc.metadata.id.indexOf("nft-"))
        const content = `${nftID}:- ${nftMetadata.name}: ${nftMetadata.description}`;
        results.push(content);
        // agentState.messages = [...agentState.messages, ToolsMessage("nft-search", content)];
    // console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
    }

    const content = JSON.stringify(results);
    // const content = results.join("\n");
    agentState.messages = [...agentState.messages, ToolsMessage("nft-search", JSON.stringify({content: content}))];
      
    return {
        success: true,
        data: {...agentState}
    };
}

const runStart = async (userInput: string, agentState: AgentState): Promise<APICallReturn<AgentState>> => {
    const system = EXTRACT_PARAMS_SYSTEM_PROMPT;
    const resp = await callOpenAI(system, userInput, agentState);
    if(resp.success == true) {
        const lastMessage = resp.data.messages[resp.data.messages.length - 1];
        console.log("extractParams lastMessage: ", lastMessage);

        const toolObj = JSON.parse(lastMessage.content);

        if(toolObj.toolName === "SEARCH_NFT") {
            const nftSearchResp = await runNFTSearch(userInput, resp.data);
            return nftSearchResp;
        }
        else if(toolObj.toolName === "PURCHASE_NFT") {
            const purchaseResp = await purchaseNFT(userInput, resp.data);
            return purchaseResp;
            // return {
            //     success: true,
            //     data: {...resp.data, messages: [...resp.data.messages, AIMessage("Please enter the NFT ID you want to purchase.")], curNode: "PURCHASE_NFT"}
            // }
        }
        else if (toolObj.toolName === "GET_OWNED_NFTS") {
            const getOwnedNFTsResp = await getOwnedNFTs(resp.data);
            return getOwnedNFTsResp;
        }
        else if (toolObj.toolName === "QUESTIONS") {
            return {
                success: true,
                data: {...resp.data}
            }
        }
    }
    return resp;
}

async function runStart1(userInput: string, agentState: AgentState): Promise<APICallReturn<{state: AgentState}>> {

    const paramResp = await extractParams(userInput, agentState);
    console.log("paramResp: ", paramResp);
    if(paramResp.success == false) throw paramResp.data;
    agentState = paramResp.data.state;

    if(paramResp.data.params.projectID === "") {
        agentState.messages = [...agentState.messages, AIMessage("Please enter a valid project ID.")];
        return {
            success: true,
            data: {
                state: {...agentState}
            }
        };
    }

    if(paramResp.data.params.questions !== "") {
        agentState.state.appParams = paramResp.data.params;
        agentState.messages = [...agentState.messages, AIMessage(paramResp.data.params.questions)];

        return {
            success: true,
            data: {
                state: {...agentState}
            }
        };
    }

    const params = paramResp.data.params;
    const validateResp = validateParams(params);

    if(validateResp.success) {
        agentState.curNode = "CONFIRM_PARAMS";
        agentState.state.appParams = params;
        agentState.messages = [...agentState.messages, AIMessage("Validation passed. Please confirm your parameters." + JSON.stringify(params))];
        return {
            success: true,
            data: {
                state: {...agentState}
            }
        };  
    }
    else {
        agentState.messages = [...agentState.messages, AIMessage("Validation failed. Please try again.")];
        return {
            success: true,
            data: {
                state: {...agentState}
            }
        };
    }
}

async function run(userInput: string, agentState: AgentState): Promise<APICallReturn<AgentState>> {
    try {
    
    if(agentState.curNode === "START" ) {
        return await runStart(userInput, agentState);
    }
    // if(agentState.curNode === "CONFIRM_PARAMS") {
    //     return await confirmParams(userInput, agentState);
    // }
    // if(agentState.curNode === "DEPLOY_APP") {
    //     return await runDeployApp(userInput, agentState);
    // }

} catch(err) {
    return {
        success: false,
        data: err
    };
}
}

const searchTavily = async (query: string) => {

    
    // Define the tools the agent will have access to.
    const tools = [new TavilySearchResults({ maxResults: 1 })];
    
    // Get the prompt to use - you can modify this!
    // If you want to see the prompt in full, you can at:
    // https://smith.langchain.com/hub/hwchase17/openai-functions-agent
    const prompt = await pull<ChatPromptTemplate>(
      "hwchase17/openai-functions-agent"
    );
    
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
    });
    
    const agent = await createOpenAIFunctionsAgent({
      llm,
      tools,
      prompt,
    });
    
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
    });
    
    const result = await agentExecutor.invoke({
    //   input: "what is the weather in wailea?",
    input: "Please deploy alethio/ethereum-lite-explorer with the tag as latest and port 80 with CPU as 0.25 core and 2000 mb ram and add a balance of 1 day"
    });
    
    console.log(result);
    
    /*
      {
        input: 'what is the weather in wailea?',
        output: "The current weather in Wailea, HI is 64°F with clear skies. The high for today is 82°F and the low is 66°F. If you'd like more detailed information, you can visit [The Weather Channel](https://weather.com/weather/today/l/Wailea+HI?canonicalCityId=ffa9df9f7220c7e22cbcca3dc0a6c402d9c740c755955db833ea32a645b2bcab)."
      }
    */
}

const checkSubnet = async (userInput: string, agentState: AgentState) => {
    const system = EXTRACT_SUBNET_SYSTEM_PROMPT;
    const resp = await callOpenAI(system, userInput, agentState);
    return resp;
}



// let state: AgentState = {
//     curNode: "START",
//     messages: [],
//     state: {
//         projectID: "",
//         appParams: {
//             appName: "",
//             image: "",
//             httpPort: 0,
//             timeDuration: 0,
//         }
//     }
// };

let messageCount = 0;

let state: AgentState = {
    curNode: "START",
    messages: [],
    state: {
        projectID: "",
        appParams: {
            appName: "",
            image: "",
            httpPort: 0,
            timeDuration: 0,
        }
    }
};

app.post('/stream', async (req, res) => {
    // Set headers for chunked transfer
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');

    console.log("hit /stream: ")

    const input = req.body.input;
    res.write(JSON.stringify({
        type: "human",
        content: input
    }))

    try {
        do {
            const resp = await run(input, state);
            if(resp.success == false) throw resp.data;
            state = resp.data;

            let messages = state.messages.slice(messageCount);
            let retMessages = messages.forEach((mesg) => {
                messageCount++;
                // return {
                //     type: mesg.role,
                //     content: mesg.content
                // }
                if(mesg.role === 'system' || mesg.role === 'assistant-hidden') return;
                console.log("mesg: ", mesg);
                res.write(JSON.stringify({
                    type: mesg.role,
                    content: mesg.content
                }) + '\n')
            })

            console.log("retMessages: ", retMessages);
            // res.write(JSON.stringify(retMessages));
        } while(state.continue);

        // await searchTavily(input);
        // const subnetResp = await checkSubnet(input, state);
        // console.log("subnetResp: ", subnetResp);

        // if(subnetResp.success == false) throw subnetResp.data;
        // const lastMessage = subnetResp.data.messages[subnetResp.data.messages.length - 1];
        // console.log("lastMessage: ", lastMessage);
        // res.write(JSON.stringify({
        //     type: "assistant",
        //     content: lastMessage.content
        // }) + '\n')
        // const resp = await invokeLLM(input);
        // console.log("resp: ", resp);
        
        // res.write(JSON.stringify({
        //     type: "assistant",
        //     content: resp
        // }) + '\n')

        // Close the response after streaming is complete
        res.end();
    } catch (error) {
        console.error("Error in stream:", error);
        res.status(500).send("Internal Server Error");
    }
});




// Stream endpoint to generate a story
// app.post("/stream", async (req, res) => {
//     console.log("hit /stream: ")
//   try {
//     // const completion = await openai.chat.completions.create(
//     //   {
//     //     model: "gpt-4o-mini",
//     //     prompt: "Generate a story",
//     //     max_tokens: 150,
//     //     stream: true,
//     //   },
//     //   { responseType: "stream" }
//     // );
//     // const stream = await openai.beta.chat.completions.stream({
//     //     model: 'gpt-4',
//     //     messages: [{ role: 'user', content: 'Generate a story' }],
//     //     stream: true,

//     //   });
//     // const response = await openai.chat.completions.create({
//     //     model: "gpt-4",
//     //     messages: [
//     //       { role: "user", content: "Generate a story" },
//     //     ],
//     //   });

//     const params = await extractParams(req.body.input);

//     res.setHeader("Content-Type", "text/event-stream");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");


//       res.write(`${JSON.stringify({
//         type: "ai",
//         content: params
//       })}\n`);
      
//     // stream.on("content", (chunk) => {
//     //     console.log("chunk: ", chunk)
//     //   const lines = chunk.toString().split("\n").filter((line) => line.trim() !== "");
//     //   for (const line of lines) {
//     //     const message = line.replace(/^data: /, "");
//     //     if (message === "[DONE]") return res.end();
//     //     try {
//     //       const parsed = JSON.parse(message);
//     //       res.write(`data: ${parsed.choices[0].text}\n\n`);
//     //     } catch (error) {
//     //       console.error("Error parsing JSON:", error);
//     //     }
//     //   }
//     // });


//   } catch (error) {
//     console.error("Error fetching from OpenAI:", error);
//     res.status(500).send("Error generating story");
//   }
// });

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
