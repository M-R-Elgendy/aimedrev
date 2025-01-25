import { AxiosService } from "src/axios/axios.service";
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";

@Injectable()
export class CustomEmbeddings {
    constructor(
        private readonly axiosService: AxiosService,
        private readonly configService: ConfigService
    ) { }

    async embedQuery(query: string) {
        return [await this.getEmbeddings(query)];
    }

    async embedDocuments(documents: string[]) {
        return Promise.all(documents.map((doc: string) => this.getEmbeddings(doc)));
    }

    private async meanPool(tokenEmbeds: any[]) {
        const length = tokenEmbeds.length;
        const sum = tokenEmbeds.reduce((acc, vec) => {
            if (!acc) return vec.slice();
            return acc.map((a: number, i: number) => a + vec[i]);
        }, null);
        return sum.map((x: number) => x / length);
    }

    private async getEmbeddings(inputs: string) {
        const apiUrl = this.configService.getOrThrow("HF_API_URL");
        const apiKey = this.configService.getOrThrow("HF_API_KEY");
        const payload = { inputs }
        const headers = { Authorization: `Bearer ${apiKey}` };

        try {
            const response = await this.axiosService.anonRequest({
                method: 'POST',
                url: apiUrl,
                headers,
                data: payload
            });
            return this.meanPool(response.data[0]);
        } catch (error) {

            if (error.response?.status === 503 && error.response.data?.error.includes('currently loading')) {
                const waitTime = error.response.data.estimated_time || 5;
                await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                return this.getEmbeddings(inputs);
            } else {
                console.error('Error fetching embeddings:', error.response?.data || error.message);
                throw error;
            }

        }

    }

}