import { HttpStatus, Injectable, HttpException } from '@nestjs/common';
import { CreatePlanDto, FREQUENCY } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Plan, PrismaClient, Subscription, User } from '@prisma/client'
import { StripeService } from 'src/stripe/stripe.service';
import { AuthContext } from 'src/auth/auth.context';
import { Utlis } from 'src/global/utlis';
import * as moment from 'moment';
@Injectable()
export class PlanService {

  constructor(private readonly authContext: AuthContext) { }
  private readonly prisma: PrismaClient = new PrismaClient();
  private readonly stripeService: StripeService = new StripeService();
  private readonly utlis: Utlis = new Utlis();

  async create(createPlanDto: CreatePlanDto) {
    try {
      const plan = await this.prisma.plan.create({ data: createPlanDto });
      return {
        message: "Plan created successfully",
        plan: plan,
        status: HttpStatus.CREATED
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
      status: HttpStatus.OK
    }
  }

  async findOne(id: string) {
    try {
      const plan = await this.prisma.plan.findFirst({
        where: { id: id, isDeleted: false },
      });

      if (!plan) throw new HttpException({ message: 'Plan not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);

      return {
        message: "Plan fetched successfully",
        plan: plan,
        status: HttpStatus.OK
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

      if (!plan) throw new HttpException({ message: 'Plan not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
      const updatedPlan = await this.prisma.plan.update({ where: { id: id }, data: updatePlanDto });
      return {
        message: "Plan updated successfully",
        plan: updatedPlan,
        status: HttpStatus.OK
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

      if (!plan) throw new HttpException({ message: 'Plan not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);

      await this.prisma.plan.update({ where: { id: id }, data: { isDeleted: true } });

      return {
        message: "Plan deleted successfully",
        plan: {},
        status: HttpStatus.OK
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

      if (!plan) throw new HttpException({ message: 'Plan not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
      if (plan.isActive == isActive) throw new HttpException({ message: 'Plan already ' + (isActive ? 'active' : 'inactive'), status: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST);

      const updatedPlan = await this.prisma.plan.update({ where: { id: id }, data: { isActive: isActive } });

      return {
        message: (isActive) ? "Plan activated successfully" : "Plan deactivated successfully",
        plan: updatedPlan,
        status: HttpStatus.OK
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

      if (!plan) throw new HttpException({ message: 'Plan not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
      if (!user) throw new HttpException({ message: 'User not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);

      const hasActiveSubscription = this.hasActiveSubscription(user);
      if (hasActiveSubscription) {
        throw new HttpException({ message: 'User already have a plan', status: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST)
      }

      const { price, userCountryCode } = await this.getPlanPrice(plan);
      const { periodUnit, periodItems } = this.getPalnFrequancy(plan);

      const endDate = (periodUnit) ? moment().add(periodItems, periodUnit).toDate() : null;
      const createdSupscription = await this.prisma.subscription.create({
        data: {
          startDate: moment().toDate(),
          endDate: endDate,
          totalQueries: plan.qeriesCount,
          price: price / 100,
          userId: this.authContext.getUser().id,
          planId: plan.id,
        }
      });

      const stripeSessionObject = this.generateStripeSessionObject(createdSupscription.id, userCountryCode, plan, price, endDate);

      return {
        message: "Session created successfully",
        createdSupscription,
        stripeSessionObject,
        status: HttpStatus.OK
      }

    } catch (error) {
      throw error;
    }

  }

  private getPalnFrequancy(plan: Plan) {

    let periodUnit: moment.unitOfTime.Base | null, periodItems: number;
    switch (plan.frequency) {
      case FREQUENCY.monthly:
        periodUnit = 'M'
        periodItems = 1
        break;
      case FREQUENCY.yearly:
        periodUnit = 'y'
        periodItems = 1
        break;
      case FREQUENCY.quarterly:
        periodUnit = 'M'
        periodItems = 3
        break;
      case FREQUENCY.biannually:
        periodUnit = 'M'
        periodItems = 6
        break;
      case FREQUENCY.unlimited:
        periodUnit = null
        periodItems = null
        break;
      default:
        throw new HttpException({ message: 'Invalid frequency', status: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST);
        break;
    }

    return { periodUnit, periodItems };
  }

  private async getPlanPrice(plan: Plan) {
    try {

      // const userIP = this.authContext.getUser().IP;
      const userIP = '197.62.223.227';
      const userCountrData = await this.utlis.getCountryCodeFromIP(userIP);
      const userCountryCode = userCountrData.country_code;

      let price = (userCountryCode == 'EG') ? plan.egPrice : plan.globalPrice;
      if (!price) throw new HttpException({ message: 'Plan not available in your country', status: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST);
      price = Math.ceil(price * 100); // Zero-decimal currencies to charge 10 USD, provide an amount value of 1000 (that is, 1000 cents).

      return { price, userCountryCode };
    } catch (error) {
      throw error;
    }
  }

  private generateStripeSessionObject(supscriptionId: string, userCountryCode: string, plan: Plan, price: number, endDate: Date) {
    try {

      return {
        client_reference_id: this.authContext.getUser().id,
        success_url: `${process.env.PAYMENT_SUCCESS_CALLBACK}/${supscriptionId}`,
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
          endDate: endDate,
          planTitle: plan.title,
          planDescription: plan.description,
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

  private hasActiveSubscription(user: User & { Subscription: Subscription[] }) {

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
