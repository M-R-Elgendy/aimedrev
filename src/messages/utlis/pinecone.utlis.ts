import { CustomEmbeddings } from "./custom-embeddings.utlis";
import { Pinecone } from "@pinecone-database/pinecone";
import { Document } from "@langchain/core/documents";
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PineconeUtlis {
    // private readonly configService = new ConfigService();
    // private readonly customEmbeddings = new CustomEmbeddings(null, this.configService);
    // private readonly pinecone = new Pinecone({
    //     apiKey: this.configService.getOrThrow('PINECONE_API_KEY'),
    // });
    constructor(
        private readonly pinecone: Pinecone,
        private readonly customEmbeddings: CustomEmbeddings,
        private readonly configService: ConfigService
    ) {
        this.pinecone = new Pinecone({
            apiKey: this.configService.getOrThrow('PINECONE_API_KEY'),
        });
    }

    async retrieve(query: string, topK: number, minThreshold = 0.5): Promise<Document<{ score: number;[key: string]: any }>[]> {

        const pineconeIndex = this.configService.getOrThrow('PINECONE_INDEX');
        const index = this.pinecone.Index(pineconeIndex);

        const queryEmbedding = await this.customEmbeddings.embedQuery(query);

        const queryRequest = {
            vector: queryEmbedding,
            topK: topK,
            includeMetadata: true
        };
        const queryResponse = await index.query(queryRequest);

        const documents = queryResponse.matches
            .filter(match => match.score >= minThreshold)
            .map((match) => {
                const { text, ...otherMetadata } = match.metadata;

                // To be checked
                return new Document({
                    pageContent: text.toString() ?? "",
                    metadata: {
                        ...otherMetadata,
                        score: match.score
                    }
                });
            });

        return documents;
    }

    async rankDocuments(documents: any[], query: string, topN: number) {

        const rankedDocuments = await this.pinecone.inference.rerank(
            "bge-reranker-v2-m3",
            query,
            documents,
            {
                topN: topN,
                returnDocuments: true,
                parameters: { truncate: 'END' }
            }
        )

        return rankedDocuments;
    }
}