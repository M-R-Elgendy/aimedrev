import { Injectable } from "@nestjs/common";
import { ExaUtlis } from "./exa.utlis";
import { PineconeUtlis } from "./pinecone.utlis";
import { Document } from "@langchain/core/documents";


@Injectable()
export class MultiRetriever {

    constructor(
        private readonly pineconeUtlis: PineconeUtlis,
        private readonly exaUtlis: ExaUtlis,
    ) { }

    async retrieve(query: string, topN: number): Promise<Document[]> {

        const exaDocuments = await this.exaUtlis.retrieve(query, 25);
        const pineconeDocuments = await this.pineconeUtlis.retrieve(query, 25);
        const documents = [...pineconeDocuments, ...exaDocuments];

        const docsToBeRanked = documents.map((d, i) => ({
            id: i.toString(),
            text: d.pageContent,
            metadata: d.metadata
        }));

        const rankedDocuments = await this.pineconeUtlis.rankDocuments(docsToBeRanked, query, topN);

        const results = rankedDocuments.data.map((item) => {

            const metaData: any = { score: item.score };
            if (item.document?.metadata) {
                for (const [key, value] of Object.entries(item.document.metadata)) {
                    metaData[key] = value;
                }
            }
            return new Document({
                pageContent: item.document.text || "",
                metadata: metaData
            });

        });

        return results;
    }
}