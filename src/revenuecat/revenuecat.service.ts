import { Injectable } from '@nestjs/common';
import { AxiosService } from '../axios/axios.service';

@Injectable()
export class RevenuecatService {
    constructor(public readonly axiosService: AxiosService) { }

    async generateRequest(type: 'GET' | 'POST', body?: any) {
        const baseUrl = process.env.REVENUCAT_API_URL;
        const headers = {
            Accept: "application/json",
            "X-Platform": "Aimedrev Server",
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.REVENUCAT_SANDBOX_API_KEY}`
        };
        const requestConfig = {
            method: type,
            url: baseUrl,
            headers,
            data: body
        }
        const response = await this.axiosService.anonRequest(requestConfig);
    }

}
