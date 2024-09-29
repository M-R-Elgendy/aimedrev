import { Injectable, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AxiosService {

    async post(url: string, data: any): Promise<any> {
        try {
            const response = await axios.post(url, data);
            return { statusCode: HttpStatus.OK, data: response.data };
        } catch (error) {
            return { statusCode: HttpStatus.BAD_REQUEST, data: error.response.data.message };
        }
    }

    async get(url: string, headers?: object): Promise<any> {
        try {
            const response = await axios.get(url, { headers });
            return { statusCode: HttpStatus.OK, data: response.data };
        } catch (error) {
            return { statusCode: HttpStatus.BAD_REQUEST, data: error.response.data.message };
        }
    }

    async anonRequest(config: { method: string, url: string, headers: any, data?: any }) {
        try {
            const response = await axios.request(config);
            return { statusCode: HttpStatus.OK, data: response.data };
        } catch (error) {
            return { statusCode: HttpStatus.BAD_REQUEST, data: error.response.data.message };
        }

    }
}