import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from '@langchain/pinecone';
import { Document } from "@langchain/core/documents";
import axios from 'axios';

dotenv.config();

const runListener = async () => {

    const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
          // model: 'multilingual-e5-large',
      });

      const pinecone = new PineconeClient();
      const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);


    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
        // Maximum number of batch requests to allow at once. Each batch is 1000 vectors.
        maxConcurrency: 5,
        // You can pass a namespace here too
        // namespace: "foo",
    });



    
    // Replace with your contract's ABI and address
    const contractABI = [
    "event SetTokenURI(uint256 tokenID, string tokenURI)"
    ];
    const contractAddress = "0xE72A418E1fa757D835c6ab1C7Cca074173a2Ca96";

    // Initialize provider - replace with your provider URL
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL!);

    // Create contract instance
    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    // Listen for SetTokenURI events
    contract.on("*", async (args) => {
        console.log("args: ", args.topics[0]);
        if(args.topics[0] === '0xd2d827dddfc9c9a02afc5fc68d3251684b36e213a7999ebd90a861f25df4077e') {
            console.log("New TokenURI set!");
            console.log("Token ID:", args.args.tokenID.toString());
            console.log("New URI:", args.args.tokenURI);

            const resp = await axios.get(`https://gateway.lighthouse.storage/ipfs/${args.args.tokenURI}`)
            console.log(resp.data)

            const nftMetadataList = [{id: args.args.tokenID.toString(), text: JSON.stringify(resp.data)}]

   
    
            const idList = nftMetadataList.map((item) => {
                return item.id;
            });

            const documents = nftMetadataList.map((item) => {
                return new Document({
                    pageContent: item.text,
                    metadata: { id: `nft-${item.id}` },
                });
            })




            // const documents = nftMetadataList.map((item) => {
            //     return {}
            // });

            await vectorStore.addDocuments(documents, { ids: idList });

        }
    });

    // Error handling
    contract.on("error", (error) => {
        console.error("Error in event listener:", error);
    });
}

runListener();