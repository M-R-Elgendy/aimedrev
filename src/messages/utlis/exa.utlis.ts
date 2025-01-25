import { ExaRetriever } from "@langchain/exa";
import { VectorStore } from "./vector.store";
import Exa from "exa-js";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export class ExaUtlis {

    private readonly exa = new Exa(process.env.EXA_API_KEY);
    private readonly vectorStore = new VectorStore();

    async splitDocuments(documents: any, chunkSize = 2000, chunkOverlap = 500, minChunkSize = 80) {

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: chunkSize,
            chunkOverlap: chunkOverlap,
        });

        let splitDocs = await textSplitter.splitDocuments(documents);
        splitDocs = splitDocs.filter(doc => doc.pageContent.trim().length >= minChunkSize);
        return splitDocs;
    }

    async retrieve(query: string, topK: number) {

        try {
            const retriever = new ExaRetriever({
                client: this.exa,
                searchArgs: {
                    numResults: 3,
                    category: "research paper",
                    includeDomains: ["https://pmc.ncbi.nlm.nih.gov"],
                },
            });

            const exaDocs = await retriever.invoke(query);
            const chunkedDocs = await this.splitDocuments(exaDocs);

            const similarityThreshold = 0.5;
            const vectorStore = new VectorStore(similarityThreshold);
            await vectorStore.addDocuments(chunkedDocs);

            const retrievedDocs = await vectorStore.similaritySearch(query, topK);
            return retrievedDocs;

        } catch (error) {
            throw error;
        }
    }

}