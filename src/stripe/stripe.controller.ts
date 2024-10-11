import { Controller, Post, UseGuards, Req, UnprocessableEntityException } from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
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
        this.subscriptionService.handelSuccessInvoiceEvent(event.data.object);
        break;
      case 'invoice.payment_failed':
        this.subscriptionService.handelSubscriptionExpiringEvent(event);
      default:
        throw new UnprocessableEntityException('Un-suported event');
    }
  }
}