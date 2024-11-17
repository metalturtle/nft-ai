import { PineconeStore } from "@langchain/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";

import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

import { Document } from "@langchain/core/documents";

const document1: Document = {
  pageContent: "The powerhouse of the cell is the mitochondria",
  metadata: { source: "https://example.com" },
};

const document2: Document = {
  pageContent: "Buildings are made out of brick",
  metadata: { source: "https://example.com" },
};

const document3: Document = {
  pageContent: "Mitochondria are made out of lipids",
  metadata: { source: "https://example.com" },
};

const document4: Document = {
  pageContent: "The 2024 Olympics are in Paris",
  metadata: { source: "https://example.com" },
};



const nftMetadataList = [
    {
      id: 'nft-1',
      text: '{"name":"CozyStay Boutique NFT","description":"A unique NFT for a 3-night stay at the CozyStay Boutique Hotel, offering a charming local experience in Bangkok.","image":"https://example.com/images/cozystay.png","attributes":[{"trait_type":"Room Type","value":"Superior Room"},{"trait_type":"Location","value":"Bangkok"},{"trait_type":"Validity","value":"2024-06-30"},{"trait_type":"Perks","value":"Free Local Tour & Welcome Drink"},{"trait_type":"Style","value":"Boutique"}]}'
    },
    {
      id: 'nft-2',
      text: '{"name":"SmartBudget Hotel NFT","description":"A token for a 2-night stay in a clean and modern budget-friendly hotel in Bangkok.","image":"https://example.com/images/smartbudget.png","attributes":[{"trait_type":"Room Type","value":"Standard Room"},{"trait_type":"Location","value":"Bangkok"},{"trait_type":"Validity","value":"2024-03-31"},{"trait_type":"Perks","value":"Free WiFi & Early Check-in"},{"trait_type":"Price Tier","value":"Budget"}]}'
    },
    {
      id: 'nft-3',
      text: '{"name":"Skyline Heights Hotel NFT","description":"An NFT for a rooftop suite stay at the Skyline Heights Hotel, featuring breathtaking views of Bangkok.","image":"https://example.com/images/skyline_heights.png","attributes":[{"trait_type":"Room Type","value":"Rooftop Suite"},{"trait_type":"Location","value":"Bangkok"},{"trait_type":"Validity","value":"2025-01-31"},{"trait_type":"Perks","value":"Rooftop Access & Private Dining"},{"trait_type":"Views","value":"City Skyline"}]}'
    },
    {
    id: 'nft-4',
      text: '{"name":"GreenHaven Eco-Lodge NFT","description":"An NFT granting a 5-night stay at the eco-friendly GreenHaven Lodge in the heart of Bangkok.","image":"https://example.com/images/greenhaven.png","attributes":[{"trait_type":"Room Type","value":"Eco-Lodge Suite"},{"trait_type":"Location","value":"Bangkok"},{"trait_type":"Validity","value":"2024-11-30"},{"trait_type":"Perks","value":"Sustainable Meals & Yoga Classes"},{"trait_type":"Theme","value":"Eco-Friendly"}]}'
    },
    {
      id: 'nft-5',
      text: '{"name":"GreenHaven Eco-Lodge NFT","description":"An NFT granting a 5-night stay at the eco-friendly GreenHaven Lodge in the heart of Bangkok.","image":"https://example.com/images/greenhaven.png","attributes":[{"trait_type":"Room Type","value":"Eco-Lodge Suite"},{"trait_type":"Location","value":"Bangkok"},{"trait_type":"Validity","value":"2024-11-30"},{"trait_type":"Perks","value":"Sustainable Meals & Yoga Classes"},{"trait_type":"Theme","value":"Eco-Friendly"}]}'
    }
  ]
  

dotenv.config();

const runQA = async () => {


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

console.log("vectorStore", vectorStore);

const documents = nftMetadataList.map((item) => {
    return new Document({
        pageContent: item.text,
        metadata: { id: item.id },
    });
});

const idList = nftMetadataList.map((item) => {
    return item.id;
});

// const documents = [document1, document2, document3, document4];

await vectorStore.addDocuments(documents, { ids: idList });


// const similaritySearchResults = await vectorStore.similaritySearch(
//   "eco friendly hotel",
//   2,
// );

const retriever = vectorStore.asRetriever({
    // Optional filter
    // filter: filter,
    k: 2,
  });

  const resp = await retriever.invoke("eco friendly hotel");

  console.log("resp", resp);
// // console.log("similaritySearchResults", similaritySearchResults);

// for (const doc of similaritySearchResults) {
//   console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
// }

}

runQA();