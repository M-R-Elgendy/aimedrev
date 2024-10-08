import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {

    private readonly stripe = new Stripe(process.env.STRIPE_API_KEY);

    async createCheckOutSession(date: Stripe.Checkout.SessionCreateParams) {
        const session = await this.stripe.checkout.sessions.create(date);
        return session;
    };

    // Get session by id
    async getSession(id: string) {
        const session = await this.stripe.checkout.sessions.retrieve(id);
        return session;
    }

    async createProduct(date: Stripe.ProductCreateParams) {
        const product = await this.stripe.products.create(date);
        return product;
    }

    async updateProduct(id: string, date: Stripe.ProductUpdateParams) {
        const product = await this.stripe.products.update(id, date);
        return product;
    }

    async createPrice(date: Stripe.PriceCreateParams) {
        const price = await this.stripe.prices.create(date);
        return price;
    }

    async updatePrice(id: string, date: Stripe.PriceUpdateParams) {
        const price = await this.stripe.prices.update(id, date);
        return price;
    }

    async archivePrice(id: string) {
        const price = await this.stripe.prices.update(id, { active: false });
        return price;
    }

    async getProduct(id: string) {
        const product = await this.stripe.products.retrieve(id);
        return product;
    }

    async getProducts() {
        const products = await this.stripe.products.list();
        return products;
    }

    async getProductPrices(id: string, lookupKey?: string) {
        const query = {
            product: id,
            lookup_keys: lookupKey ? [lookupKey] : undefined
        };
        const prices = await this.stripe.prices.list(query);
        return prices;
    }

    async createSubscription(date: Stripe.SubscriptionCreateParams) {
        const subscription = await this.stripe.subscriptions.create(date);
        return subscription;
    }
}
