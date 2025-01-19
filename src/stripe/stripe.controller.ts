import { Controller, Post, UseGuards, Req, Get } from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import Stripe from 'stripe';
import { Roles } from '../global/decorators/role.decorator';
import { Role } from 'src/global/types';

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly subscriptionService: SubscriptionService
  ) { }

  @Post('create-webhook')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.ADMIN])
  async createWebHookEndpoint() {
    const webhookEndpoint = await this.stripeService.createWebHookEndpoint();
    return webhookEndpoint;
  }

  @Post('webhook')
  async handleStripeWebhook(@Req() req: Request) {
    const sig = req.headers['stripe-signature'];
    const event = this.stripeService.constructEvent(req.body, sig as string);
    switch (event.type) {

      case 'invoice.payment_succeeded':
        console.log('invoice.payment_succeeded', new Date());
        await this.subscriptionService.handelSuccessInvoiceEvent(event.data.object);
        break;

      case 'subscription_schedule.expiring':
        console.log('subscription_schedule.expiring', new Date());
        await this.subscriptionService.handelSubscriptionExpiringEvent(event.data.object);
        break;

      case 'charge.refund.updated':
        console.log('charge.refund.updated', new Date());
        await this.subscriptionService.handelRefundUpdateEvent(event.data.object as any);
        break;

      case 'charge.refunded':
        console.log('charge.refunded', new Date());
        await this.subscriptionService.handelSuccessRefundEvent(event.data.object as any);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
        return { code: 422, message: `Unhandled event type ${event.type}` };
    }

    return { message: 'Subscription renewd successfully' };
  }

  @Get('users/cards')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.USER, Role.PAID_USER])
  async getCards() {
    const cards = await this.stripeService.getPaymentMethods();
    return cards;
  }

  // @Post('users/:id/cards')
  // @UseGuards(AuthGuard, RoleGuard)
  // @Roles([Role.USER, Role.PAID_USER])
  // async createCard(@Req() req: Request) {
  //   const card = await this.stripeService.createPaymentMethod(req.params.id);
  //   return card;
  // }
}