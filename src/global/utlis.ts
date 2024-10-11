import { Injectable } from "@nestjs/common";
import { AxiosService } from "src/axios/axios.service";
@Injectable()
export class Utlis {

    constructor(private readonly axiosService: AxiosService) { }

    generateRandomNumber(length: number): number {
        const digits = '0123456789';
        let OTP = '';
        for (let i = 0; i < length; i++) {
            OTP += digits[Math.floor(Math.random() * 10)];
        }
        return +OTP;
    }

    async getCountryCodeFromIP(IP: string): Promise<{ country_code: string }> {
        const response = await this.axiosService.get(`${process.env.IP_API_URL}/${IP}/json/`);
        return response.data;
    }
}