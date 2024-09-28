import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_API_TEST_KEY_PRIVATE);

@Injectable()
export class StripeService {

    async createCheckOutSession(date: Stripe.Checkout.SessionCreateParams) {
        const session = await stripe.checkout.sessions.create(date);
        return session;
    };

    // Get session by id
    async getSession(id: string) {
        const session = await stripe.checkout.sessions.retrieve(id);
        return session;
    }

}
