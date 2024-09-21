import { Injectable } from "@nestjs/common";

@Injectable()
export class Utlis {
    generateOTP(length: number): number {
        const digits = '0123456789';
        let OTP = '';
        for (let i = 0; i < length; i++) {
            OTP += digits[Math.floor(Math.random() * 10)];
        }
        return +OTP;
    }
}