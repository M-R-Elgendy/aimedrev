import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";

export class VectorStore {

    private embeddings: OpenAIEmbeddings;
    private similarityThreshold: number;
    private memoryStore: MemoryVectorStore;

    constructor(similarityThreshold = 0.5) {
        this.embeddings = new OpenAIEmbeddings()
        this.similarityThreshold = similarityThreshold;
        this.memoryStore = new MemoryVectorStore(this.embeddings);
    }

    async addDocuments(documents: Document[]) {
        try {
            await this.memoryStore.addDocuments(documents);
        } catch (error) {
            console.error("Error adding documents to the in-memory vector store:", error);
            throw error;
        }
    }

    async similaritySearch(query: string, topK: number) {
        try {

            const rawResults = await this.memoryStore.similaritySearchWithScore(query, topK);
            const filteredDocs = rawResults
                .filter(doc => doc[1] >= this.similarityThreshold)
                .map(doc => doc[0]);

            return filteredDocs;
        } catch (error) {
            console.error("Error during similarity search:", error);
            throw error;
        }
    }

}