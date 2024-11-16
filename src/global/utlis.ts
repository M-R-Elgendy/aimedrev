import { Injectable } from "@nestjs/common";
import { AxiosService } from "src/axios/axios.service";
import { ConfigService } from "@nestjs/config";
import * as moment from 'moment';
import { Subscription, User } from "@prisma/client";
@Injectable()
export class Utlis {

    constructor(
        private readonly axiosService: AxiosService,
        private readonly configService: ConfigService
    ) { }

    generateRandomNumber(length: number): number {
        const digits = '0123456789';
        let OTP = '';
        for (let i = 0; i < length; i++) {
            OTP += digits[Math.floor(Math.random() * 10)];
        }
        return +OTP;
    }

    async getCountryCodeFromIP(IP: string): Promise<{ country_code: string }> {
        const response = await this.axiosService.get(`${this.configService.getOrThrow('IP_API_URL')}/${IP}/json/`);
        return response.data;
    }

    hasActiveSubscription(subscription: Subscription[]) {
        try {
            if (subscription.length === 0) return false;

            let isQuriesExpried: boolean = false, isTimeExpired: boolean = false;
            const lastSubscription = subscription[subscription.length - 1];

            if (!lastSubscription.isActive) return false;
            if (!lastSubscription.isVerified) return false;
            if (lastSubscription.isDeleted) return false;

            if (lastSubscription.totalQueries > 0) {
                isQuriesExpried = lastSubscription.usedQuries >= lastSubscription.totalQueries;
            }

            if (lastSubscription.endDate) {
                const lastOfToday = moment().endOf('day').toDate();
                const lastOfSubscription = moment(lastSubscription.endDate).endOf('day').toDate();
                isTimeExpired = lastOfSubscription <= lastOfToday;
            }

            if (lastSubscription.totalQueries > 0 && lastSubscription.endDate) return !isQuriesExpried && !isTimeExpired;
            if (lastSubscription.endDate) return !isTimeExpired;
            if (lastSubscription.totalQueries > 0) return !isQuriesExpried;
        } catch (error) {
            throw error;
        }
    }

    extractUrls(text: string) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = text.match(urlRegex);
        return urls || [];
    }
}