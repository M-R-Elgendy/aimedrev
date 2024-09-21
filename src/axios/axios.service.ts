import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AxiosService {

    async post(url: string, data: any): Promise<any> {
        try {
            const response = await axios.post(url, data);
            return { status: 200, data: response.data };
        } catch (error) {
            return { status: 400, data: error.response.data.message };
        }
    }

    async get(url: string, headers: object): Promise<any> {
        try {
            const response = await axios.get(url, { headers });
            return { status: 200, data: response.data };
        } catch (error) {
            return { status: 400, data: error.response.data.message };
        }
    }

    async anonRequest(config: { method: string, url: string, headers: any, data?: any }) {
        try {
            const response = await axios.request(config);
            return { status: 200, data: response.data };
        } catch (error) {
            return { status: 400, data: error.response.data.message };
        }

    }
}