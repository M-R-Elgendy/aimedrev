import { HttpStatus, Injectable, HttpException } from '@nestjs/common';
import { CreatePlanDto, FREQUENCY } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Plan, PrismaClient } from '@prisma/client'
import { Utlis } from 'src/global/utlis';
import { StripeService } from 'src/stripe/stripe.service';
import Stripe from 'stripe';
import * as moment from 'moment';

@Injectable()
export class PlanService {

  constructor(
    private stripeService: StripeService,
    private readonly prisma: PrismaClient,
    private readonly utlis: Utlis
  ) { }

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

      const stripeProductUpdate: Stripe.ProductUpdateParams = {
        name: updatePlanDto.title,
        description: updatePlanDto.description,
        metadata: {
          planId: plan.id,
          frequency: updatePlanDto.frequency,
          queries: updatePlanDto.qeriesCount,
          egPrice: updatePlanDto.egPrice,
          globalPrice: updatePlanDto.globalPrice,
        },
        active: updatePlanDto.isActive
      };
      await this.stripeService.updateProduct(plan.stripeProductId, stripeProductUpdate);

      if (
        updatedPlan.egPrice > 0 && updatePlanDto.egPrice != plan.egPrice ||
        updatedPlan.globalPrice > 0 && updatePlanDto.globalPrice != plan.globalPrice
      ) {
        const prices = await this.stripeService.getProductPrices(plan.stripeProductId);

        const archivePromises = prices.data.map(async (price) => {
          return this.stripeService.updatePrice(price.id, { active: false, lookup_key: `${price.lookup_key}-${this.utlis.generateRandomNumber(7)}` });
        });

        await Promise.all(archivePromises);
        await this.createPlanPrices(updatedPlan);
      }

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
      await this.stripeService.updateProduct(plan.stripeProductId, { active: false });

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
      await this.stripeService.updateProduct(plan.stripeProductId, { active: isActive });

      return {
        message: (isActive) ? "Plan activated successfully" : "Plan deactivated successfully",
        plan: updatedPlan,
        statusCode: HttpStatus.OK
      }

    } catch (error) {
      throw error;
    }
  }

  getPalnFrequancy(plan: Plan) {

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

  async getPlanPrice(plan: Plan) {
    try {

      // const userIP = this.authContext.getUser().IP;
      // const userIP = '197.62.223.227'; // EG IP
      const userIP = '104.244.42.1'; // US IP
      const userCountrData = await this.utlis.getCountryCodeFromIP(userIP);
      const userCountryCode = userCountrData.country_code;


      const lookupKey = (userCountryCode == 'EG') ? `EG-${plan.id}` : `global-${plan.id}`;
      let priceData: Stripe.ApiList<Stripe.Price>;

      priceData = await this.stripeService.getProductPrices(plan.stripeProductId, lookupKey);

      if (!priceData?.data?.length) throw new HttpException({ message: 'Plan not available in your country', statusCode: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST);

      const price = priceData.data[0];

      return { price, userCountryCode };
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
        lookup_key: `EG-${plan.id}`
      }

      if (recurring) pricingObject.recurring = recurring;
      await this.stripeService.createPrice(pricingObject);
    }

    if (plan.globalPrice && plan.globalPrice > 0) {
      const pricingObject: Stripe.PriceCreateParams = {
        unit_amount: plan.globalPrice * 100,
        currency: 'usd',
        product: plan.stripeProductId,
        lookup_key: `global-${plan.id}`
      }

      if (recurring) pricingObject.recurring = recurring;
      await this.stripeService.createPrice(pricingObject);

    }

  }
}
