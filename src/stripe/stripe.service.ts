import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
@Injectable()
export class StripeService {

    constructor(
        private readonly prisma: PrismaClient,
        private readonly configService: ConfigService
    ) { }

    private readonly stripe = new Stripe(this.configService.getOrThrow('STRIPE_API_TEST_KEY_PRIVATE'));

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

    async revokeSubscription(id: string) {
        const subscription = await this.stripe.subscriptions.cancel(id);
        return subscription;
    }

    async revokeCustomerSubscriptions(id: string) {
        const subscriptions = await this.stripe.subscriptions.list({ customer: id, status: 'active' });

        if (subscriptions.data.length === 0) {
            return { message: 'No active subscriptions found for this customer.' };
        }

        const cancelPromises = subscriptions.data.map(subscription =>
            this.stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true })
        );
        await Promise.all(cancelPromises);
        return subscriptions;
    }

    async getsubscription(id: string) {
        const subscription = await this.stripe.subscriptions.retrieve(id);
        return subscription;
    }

    async renewSubscription(id: string, renew: boolean) {
        const subscription = await this.stripe.subscriptions.update(id, { cancel_at_period_end: !renew });
        return subscription;
    }

    async getLastActiveSubscription(customerId: string) {
        const subscriptions = await this.stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
        });
        return subscriptions[0];
    }

    async createCustomer(date: Stripe.CustomerCreateParams) {
        const customer = await this.stripe.customers.create(date);
        return customer;
    }

    async createWebHookEndpoint() {
        const webhookEndpoint: Stripe.WebhookEndpoint = await this.stripe.webhookEndpoints.create({
            url: 'https://aimedrev-api-staging.onrender.com/api/v1/stripe/webhooks/live/test',
            enabled_events: [
                'invoice.payment_succeeded',
                'invoice.payment_failed',
                'subscription_schedule.expiring',
                'charge.refunded',
                'charge.refund.updated'
            ]
        });
        await this.prisma.stripeWebhook.create({ data: { webhookData: webhookEndpoint as object } });
        return webhookEndpoint;
    }

    async getWebHookEndpoint() {
        const webhookEndpoint = await this.stripe.webhookEndpoints.list({
            limit: 1
        });
        return webhookEndpoint;
    }

    constructEvent(payload: Buffer, sig: string): Stripe.Event {
        const webhookSecret = this.configService.getOrThrow('STRIPE_WEBHOOK_SECRET');
        let event: Stripe.Event;
        try {
            event = this.stripe.webhooks.constructEvent(payload, sig, webhookSecret);
        } catch (err) {
            console.log(`⚠️  Webhook signature verification failed: ${err.message}`);
            throw new BadRequestException(`Webhook Error: ${err.message}`);
        }
        return event;
    }

    async refundInvoice(paymentIntentId: string) {
        const refund = await this.stripe.refunds.create({
            payment_intent: paymentIntentId
        });
        return refund;
    }
}
