import { BadRequestException, HttpStatus, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { StripeService } from 'src/stripe/stripe.service';
import { PlanService } from 'src/plan/plan.service';
import { PrismaClient, User, Subscription } from '@prisma/client';
import { AuthContext } from 'src/auth/auth.context';
import Stripe from 'stripe';
import * as moment from 'moment';
import { RefundService } from 'src/refund/refund.service';
import { RefundStatus } from 'src/refund/dto/create-refund.dto';
@Injectable()
export class SubscriptionService {

  constructor(
    private readonly authContext: AuthContext,
    private readonly planService: PlanService,
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaClient,
    private readonly refundService: RefundService
  ) { }

  async create(id: string) {
    try {

      const plan = await this.prisma.plan.findFirst({
        where: { id: id, isActive: true, isDeleted: false },
      });

      const user = await this.prisma.user.findFirst({
        where: {
          id: this.authContext.getUser().id,
          isDeleted: false,
          isBlocked: false
        },
        include: { Subscription: true }
      });

      if (!plan) throw new NotFoundException('Plan not found');
      if (!user) throw new NotFoundException('User not found');

      const hasActiveSubscription = this.hasActiveSubscription(user);
      if (hasActiveSubscription) {
        throw new BadRequestException('User already have a plan')
      }

      const { price, userCountryCode } = await this.planService.getPlanPrice(plan);
      const { periodUnit, intervalCount } = this.planService.getPalnFrequancy(plan);

      const endDate = (periodUnit) ? moment().add(intervalCount, periodUnit).toDate() : null;
      const createdSupscription = await this.prisma.subscription.create({
        data: {
          startDate: moment().toDate(),
          endDate: endDate,
          totalQueries: plan.qeriesCount,
          price: price.unit_amount / 100,
          userId: this.authContext.getUser().id,
          planId: plan.id
        }
      });

      const checkoutSession = await this.stripeService.createCheckOutSession({
        customer_email: user.email,
        success_url: `${process.env.PAYMENT_SUCCESS_CALLBACK_PATH}/${createdSupscription.id}`,
        cancel_url: process.env.PAYMENT_CANCEL_CALLBACK,
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        payment_method_types: ["card"],
        saved_payment_method_options: {
          payment_method_save: "enabled",
        },
      });
      await this.prisma.subscription.update({ where: { id: createdSupscription.id }, data: { stripeSession: checkoutSession as object } });

      return {
        message: "Session created successfully",
        createdSupscription,
        checkoutSessionURL: checkoutSession.url,
        statusCode: HttpStatus.OK
      }

    } catch (error) {
      throw error;
    }
  }

  async findAll() {
    try {

      const data = await this.prisma.subscription.findMany({
        where: { isActive: true },
        select: {
          id: true,
          isActive: true,
          isVerified: true,
          totalQueries: true,
          usedQuries: true,
          endDate: true,
          plan: {
            select: {
              id: true,
              title: true,
              egPrice: true,
              globalPrice: true,
              description: true
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              googleData: {
                select: {
                  picture: true
                }
              }
            }
          }
        }
      });

      return {
        message: 'Subscriptions fetched successfully',
        statusCode: HttpStatus.OK,
        data
      }

    } catch (error) {
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const data = await this.prisma.subscription.findUnique({
        where: { id },
        select: {
          id: true,
          isActive: true,
          isVerified: true,
          totalQueries: true,
          usedQuries: true,
          endDate: true,
          transactionId: true,
          stripeScpscriptionId: true,
          plan: {
            select: {
              id: true,
              title: true,
              egPrice: true,
              globalPrice: true,
              description: true
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              googleData: {
                select: {
                  picture: true
                }
              }
            }
          }
        }
      });

      if (!data) throw new NotFoundException("Subscription not found");

      return {
        message: 'Subscription fetched successfully',
        statusCode: HttpStatus.OK,
        data
      }
    } catch (error) {
      throw error;
    }
  }

  async delete(id: string) {
    try {
      const subscription = (await this.findOne(id)).data;

      if (subscription.isActive) throw new UnprocessableEntityException("Subscription is active");
      if (subscription.isVerified) throw new UnprocessableEntityException("Subscription is verified");

      await this.prisma.subscription.update({ where: { id: id }, data: { isDeleted: true } });
      await this.stripeService.revokeSubscription(subscription.stripeScpscriptionId);

      return {
        message: 'Subscription deleted successfully',
        statusCode: HttpStatus.OK,
        data: {}
      }
    } catch (error) {
      throw error;
    }
  }

  async checkout(stripeSessionObject: Stripe.Checkout.SessionCreateParams) {
    return await this.stripeService.createCheckOutSession(stripeSessionObject)
  }

  async verify(subscriptionId: string) {

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId, isDeleted: false, isVerified: { not: true } },
      include: { user: true, plan: true }
    });

    if (!subscription) throw new NotFoundException("Subscription not found");

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
          transactionId: transaction.id,
          stripeScpscriptionId: updatedSessionData.subscription as string
        },
        select: {
          id: true,
          isActive: true,
          isVerified: true,
          totalQueries: true,
          usedQuries: true,
          endDate: true,

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

  }

  async handelSuccessInvoiceEvent(invoiceData: Stripe.Invoice) {
    try {

      const customerId = 'cus_R0TCeE4pPfw2r8';
      const subscriptionId = 'sub_1Q8lgfQmWoP9SDEIOGWJeghr';
      const planId = 'prod_R0THE1NwHfWmSh';
      const paymentIntentId = 'pi_3Q8lvoQmWoP9SDEI0oKiBzN8';

      // const customerId = invoiceData.customer;
      // const subscriptionId = invoiceData.subscription; 
      // const planId = invoiceData.lines.data[0].price.product;
      // const paymentIntentId = invoiceData.payment_intent;
      const priceAmount = invoiceData.amount_paid / 100;

      const user = await this.prisma.user.findFirst({
        where: {
          stripeCustomerId: customerId as string,
          isDeleted: false,
          isBlocked: false
        },
        include: { Subscription: true }
      });

      if (!user) {
        await this.refundInvoice(paymentIntentId as string, user);
        console.warn('User not fount, invoice Refunded')
        throw new BadRequestException('Invlaid user id')
      }


      const plan = await this.prisma.plan.findFirst({
        where: { stripeProductId: planId as string, isActive: true, isDeleted: false },
      });

      if (!plan) {
        await this.refundInvoice(paymentIntentId as string, user);
        console.warn('Plan not fount, invoice Refunded')
        throw new NotFoundException('Plan not found');
      }

      const hasActiveSubscription = this.hasActiveSubscription(user);
      if (hasActiveSubscription) {
        await this.refundInvoice(paymentIntentId as string, user);
        console.warn('User already have a plan, invoice Refunded')
        throw new BadRequestException('User already have a plan')
      } else {
        await this.stripeService.revokeCustomerSubscriptions(customerId as string);
        await this.prisma.subscription.updateMany({
          where: { userId: user.id },
          data: { isActive: false }
        });
      }

      const { periodUnit, intervalCount } = this.planService.getPalnFrequancy(plan);
      const endDate = (periodUnit) ? moment().add(intervalCount, periodUnit).toDate() : null;

      const transaction = await this.prisma.transaction.create({
        data: {
          paymentMethod: 'card',
          stripeSession: invoiceData as object,
          tran_ref: invoiceData.id,
          amount: invoiceData.amount_paid / 100,
          currency: invoiceData.currency,
          userId: user.id,
          planId: plan.id
        }
      });

      await this.prisma.subscription.create({
        data: {
          startDate: moment().toDate(),
          endDate: endDate,
          totalQueries: plan.qeriesCount,
          isActive: true,
          isVerified: true,
          price: priceAmount,
          userId: user.id,
          stripeScpscriptionId: subscriptionId as string,
          planId: plan.id,
          transactionId: transaction.id
        }
      });

      return true;

    } catch (error) {
      throw error;
    }
  }

  async handelSubscriptionExpiringEvent(event: Stripe.Event.Data.Object) {

  }

  async handelRefundUpdateEvent(event: Stripe.Event.Data.Object) {

  }

  async handelRefundSuccessEvent(event: Stripe.Event.Data.Object) {

  }

  private async refundInvoice(paymentIntentId: string, user: User | null) {
    const refund = await this.stripeService.refundInvoice(paymentIntentId);
    const { amount, charge } = refund;
    await this.refundService.create({
      paymentIntentId: paymentIntentId,
      refundAmount: amount / 100,
      chargeId: charge as string,
      data: refund,
      userId: user?.id
    });
    return refund;
  }

}