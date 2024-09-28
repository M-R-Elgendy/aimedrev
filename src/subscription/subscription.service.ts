import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { StripeService } from 'src/stripe/stripe.service';
import { AuthContext } from 'src/auth/auth.context';
import { Plan, PrismaClient, Subscription, User } from '@prisma/client'

@Injectable()
export class SubscriptionService {

  private readonly prisma: PrismaClient = new PrismaClient();
  private readonly stripeService: StripeService = new StripeService();

  async checkout(stripeSessionObject: Stripe.Checkout.SessionCreateParams) {
    return await this.stripeService.createCheckOutSession(stripeSessionObject)
  }

  async verify(subscriptionId: string) {

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true, plan: true }
    });

    if (!subscription) throw new Error("Subscription not found");
    const sessionData: any = subscription.stripeSession

    const updatedSessionData = await this.stripeService.getSession(sessionData.id);

    if (updatedSessionData.payment_status === 'paid' && updatedSessionData.status === 'complete') {
      const updatedSubscription = await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: { isActive: true, stripeSession: updatedSessionData as object }
      });

      // create transaction
      return updatedSubscription
    }

  }

}
