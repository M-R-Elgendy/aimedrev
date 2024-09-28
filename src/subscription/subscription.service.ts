import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import Stripe from 'stripe';
import { StripeService } from 'src/stripe/stripe.service';
import { PrismaClient, User, Subscription } from '@prisma/client';
import * as moment from 'moment';
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

    if (!subscription) throw new NotFoundException("Subscription not found");
    if (subscription.isVerified) throw new UnprocessableEntityException("Subscription already verified");

    const sessionData: any = subscription.stripeSession

    const updatedSessionData = await this.stripeService.getSession(sessionData.id);

    if (updatedSessionData.payment_status === 'paid' && updatedSessionData.status === 'complete') {

      const transaction = await this.prisma.transaction.create({
        data: {
          paymentMethod: 'card',
          stripeSession: updatedSessionData as object,
          tran_ref: updatedSessionData.id,
          amount: (updatedSessionData.amount_total / 100),
          currency: updatedSessionData.currency,
          userId: subscription.userId,
          planId: subscription.planId
        }
      });

      const updatedSubscription = await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          isActive: true,
          isVerified: true,
          stripeSession: updatedSessionData as object,
          transactionId: transaction.id
        }
      });
      return updatedSubscription
    }

  }

  hasActiveSubscription(user: User & { Subscription: Subscription[] }) {

    if (user.Subscription.length === 0) return false;

    let isQuriesExpried: boolean = false, isTimeExpired: boolean = false;
    const lastSubscription = user.Subscription[user.Subscription.length - 1];

    if (!lastSubscription.isActive) return false;

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

  }

}
