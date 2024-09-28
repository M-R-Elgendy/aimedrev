import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {

    private readonly stripe = new Stripe(process.env.STRIPE_API_TEST_KEY_PRIVATE);

    async createCheckOutSession(date: Stripe.Checkout.SessionCreateParams) {
        const session = await this.stripe.checkout.sessions.create(date);
        return session;
    };

    // Get session by id
    async getSession(id: string) {
        const session = await this.stripe.checkout.sessions.retrieve(id);
        return session;
    }

}
