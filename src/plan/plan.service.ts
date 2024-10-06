import { HttpStatus, Injectable, HttpException } from '@nestjs/common';
import { CreatePlanDto, FREQUENCY } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Plan, PrismaClient } from '@prisma/client'
import { AuthContext } from 'src/auth/auth.context';
import { Utlis } from 'src/global/utlis';
import { StripeService } from 'src/stripe/stripe.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import Stripe from 'stripe';
import * as moment from 'moment';

@Injectable()
export class PlanService {

  constructor(private readonly authContext: AuthContext, private stripeService: StripeService) { }
  private readonly prisma: PrismaClient = new PrismaClient();
  private readonly utlis: Utlis = new Utlis();
  // private readonly stripeService: StripeService = new StripeService();
  private readonly subscriptionService: SubscriptionService = new SubscriptionService();

  async create(createPlanDto: CreatePlanDto) {
    try {

      const plan = await this.prisma.plan.create({ data: createPlanDto });

      const stripeProduct = await this.stripeService.createProduct({
        name: createPlanDto.title,
        description: createPlanDto.description,
        active: true,
        metadata: {
          planId: plan.id,
          frequency: createPlanDto.frequency,
          queries: createPlanDto.qeriesCount,
          egPrice: createPlanDto.egPrice,
          globalPrice: createPlanDto.globalPrice,
        }
      });

      const updatedPlan = await this.prisma.plan.update({
        where: { id: plan.id },
        data: { stripeProductId: stripeProduct.id }
      });

      await this.createPlanPrices(updatedPlan)

      return {
        message: "Plan created successfully",
        plan: plan,
        statusCode: HttpStatus.CREATED
      }
    } catch (error) {
      throw error;
    }
  }

  async findAll() {
    const plans = await this.prisma.plan.findMany({
      where: {
        isActive: true,
        isDeleted: false
      }
    });

    plans.map((plan) => delete plan.isDeleted);

    return {
      message: "Plans fetched successfully",
      plans: plans,
      statusCode: HttpStatus.OK
    }
  }

  async findOne(id: string) {
    try {
      const plan = await this.prisma.plan.findFirst({
        where: { id: id, isDeleted: false },
      });

      if (!plan) throw new HttpException({ message: 'Plan not found', statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);

      return {
        message: "Plan fetched successfully",
        plan: plan,
        statusCode: HttpStatus.OK
      }

    } catch (error) {
      throw error;
    }
  }

  async update(id: string, updatePlanDto: UpdatePlanDto) {
    try {
      const plan = await this.prisma.plan.findFirst({
        where: { id: id, isDeleted: false },
      });

      if (!plan) throw new HttpException({ message: 'Plan not found', statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
      const updatedPlan = await this.prisma.plan.update({ where: { id: id }, data: updatePlanDto });
      return {
        message: "Plan updated successfully",
        plan: updatedPlan,
        statusCode: HttpStatus.OK
      }
    } catch (error) {
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const plan = await this.prisma.plan.findFirst({
        where: { id: id, isDeleted: false },
      });

      if (!plan) throw new HttpException({ message: 'Plan not found', statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);

      await this.prisma.plan.update({ where: { id: id }, data: { isDeleted: true } });

      return {
        message: "Plan deleted successfully",
        plan: {},
        statusCode: HttpStatus.OK
      }

    } catch (error) {
      throw error;
    }
  }

  async planAcivity(id: string, isActive: boolean) {
    try {
      const plan = await this.prisma.plan.findFirst({
        where: { id: id, isDeleted: false },
      });

      if (!plan) throw new HttpException({ message: 'Plan not found', statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
      if (plan.isActive == isActive) throw new HttpException({ message: 'Plan already ' + (isActive ? 'active' : 'inactive'), statusCode: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST);

      const updatedPlan = await this.prisma.plan.update({ where: { id: id }, data: { isActive: isActive } });

      return {
        message: (isActive) ? "Plan activated successfully" : "Plan deactivated successfully",
        plan: updatedPlan,
        statusCode: HttpStatus.OK
      }

    } catch (error) {
      throw error;
    }
  }

  async supscribe(id: string) {

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

      if (!plan) throw new HttpException({ message: 'Plan not found', statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
      if (!user) throw new HttpException({ message: 'User not found', statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);

      const hasActiveSubscription = this.subscriptionService.hasActiveSubscription(user);
      if (hasActiveSubscription) {
        throw new HttpException({ message: 'User already have a plan', statusCode: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST)
      }

      const { price, userCountryCode } = await this.getPlanPrice(plan);
      const { periodUnit, intervalCount } = this.getPalnFrequancy(plan);

      const endDate = (periodUnit) ? moment().add(intervalCount, periodUnit).toDate() : null;
      const createdSupscription = await this.prisma.subscription.create({
        data: {
          startDate: moment().toDate(),
          endDate: endDate,
          totalQueries: plan.qeriesCount,
          price: price,
          userId: this.authContext.getUser().id,
          planId: plan.id
        }
      });

      const stripeSessionObject: Stripe.Checkout.SessionCreateParams = this.generateStripeSessionObject(createdSupscription.id, userCountryCode, plan, price, user.email);
      const checkoutSession = await this.stripeService.createCheckOutSession(stripeSessionObject);
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

  private getPalnFrequancy(plan: Plan) {

    let periodUnit: moment.unitOfTime.Base | null, intervalCount: number;
    switch (plan.frequency) {
      case FREQUENCY.monthly:
        periodUnit = 'M'
        intervalCount = 1
        break;
      case FREQUENCY.yearly:
        periodUnit = 'y'
        intervalCount = 1
        break;
      case FREQUENCY.quarterly:
        periodUnit = 'M'
        intervalCount = 3
        break;
      case FREQUENCY.yearly:
        periodUnit = 'M'
        intervalCount = 12
        break;
      case FREQUENCY.biannually:
        periodUnit = 'M'
        intervalCount = 6
        break;
      case FREQUENCY.unlimited:
        periodUnit = null
        intervalCount = null
        break;
      default:
        throw new HttpException({ message: 'Invalid frequency', statusCode: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST);
        break;
    }

    return { periodUnit, intervalCount };
  }

  private async getPlanPrice(plan: Plan) {
    try {

      // const userIP = this.authContext.getUser().IP;
      // const userIP = '197.62.223.227'; // EG IP
      const userIP = '104.244.42.1'; // US IP
      const userCountrData = await this.utlis.getCountryCodeFromIP(userIP);
      const userCountryCode = userCountrData.country_code;


      const lookupKey = (userCountryCode == 'EG') ? 'EG' : 'global';
      let priceData: Stripe.ApiList<Stripe.Price>;

      priceData = await this.stripeService.getProductPrices(plan.stripeProductId, lookupKey);

      if (!priceData?.data?.length) throw new HttpException({ message: 'Plan not available in your country', statusCode: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST);

      const price = priceData.data[0].unit_amount;

      return { price, userCountryCode };
    } catch (error) {
      throw error;
    }
  }

  private generateStripeSessionObject(supscriptionId: string, userCountryCode: string, plan: Plan, price: number, customerEmail: string): Stripe.Checkout.SessionCreateParams {
    try {

      return {
        client_reference_id: this.authContext.getUser().id,
        customer_email: customerEmail,
        success_url: `${process.env.PAYMENT_SUCCESS_CALLBACK_PATH}/${supscriptionId}`,
        cancel_url: process.env.PAYMENT_CANCEL_CALLBACK,
        line_items: [
          {
            price_data: {
              unit_amount: price,
              currency: userCountryCode === "EG" ? "egp" : "usd",
              product_data: {
                name: plan.title,
                description: plan.description,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          planId: plan.id,
          period: plan.frequency,
          startDate: moment().format("YYYY-MM-DD"),
          planTitle: plan.title,
          planDescription: plan.description,
          supscriptionId: supscriptionId,
        },
        payment_method_types: ["card"],
        payment_method_options: {
          card: {
            setup_future_usage: "off_session",
          },
        },
        mode: "payment",
        customer_creation: "always",
        saved_payment_method_options: {
          payment_method_save: "enabled",
        },

      };

    } catch (error) {
      throw error;
    }
  }

  private async createPlanPrices(plan: Plan) {

    const { intervalCount } = this.getPalnFrequancy(plan);
    let recurring: Stripe.PriceCreateParams.Recurring | null = null;
    if (plan.frequency != FREQUENCY.unlimited) {
      recurring = {
        interval: 'month',
        interval_count: intervalCount
      }
    };

    if (plan.egPrice && plan.egPrice > 0) {

      const pricingObject: Stripe.PriceCreateParams = {
        unit_amount: plan.egPrice * 100,
        currency: 'egp',
        product: plan.stripeProductId,
        lookup_key: "EG"
      }

      if (recurring) pricingObject.recurring = recurring;
      await this.stripeService.createPrice(pricingObject);
    }


    if (plan.globalPrice && plan.globalPrice > 0) {
      const pricingObject: Stripe.PriceCreateParams = {
        unit_amount: plan.globalPrice * 100,
        currency: 'usd',
        product: plan.stripeProductId,
        lookup_key: "global"
      }

      if (recurring) pricingObject.recurring = recurring;
      await this.stripeService.createPrice(pricingObject);

    }

  }
}
