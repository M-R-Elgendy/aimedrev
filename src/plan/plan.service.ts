import { HttpStatus, Injectable, HttpException } from '@nestjs/common';
import { CreatePlanDto, FREQUENCY } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PrismaClient } from '@prisma/client'
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

    if (user?.Subscription.length) {

      const lastSubscription = user.Subscription[user.Subscription.length - 1];
      const lastOfToday = moment().endOf('day').toDate();
      const lastOfSubscription = moment(lastSubscription.endDate).endOf('day').toDate();

      if (lastOfSubscription > lastOfToday && lastSubscription.usedQuries < lastSubscription.totalQueries) {
        throw new HttpException({ message: 'User already have a plan', status: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST)
      }

    };

    // const userIP = this.authContext.getUser().IP;
    const userIP = '197.62.223.227';
    const userCountrData = await this.utlis.getCountryCodeFromIP(userIP);
    const userCountryCode = userCountrData.country_code;

    let price = (userCountryCode == 'EG') ? plan.egPrice : plan.globalPrice;
    if (!price) throw new HttpException({ message: 'Plan not available in your country', status: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST);
    price = Math.ceil(price * 100); // Zero-decimal currencies to charge 10 USD, provide an amount value of 1000 (that is, 1000 cents).

    const stripeSession = await this.stripeService.createCheckOutSession({
      client_reference_id: this.authContext.getUser().id,
      success_url: `https://www.aimedrev.com/payment/verify/`,
      cancel_url: "https://www.aimedrev.com/pricing",

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

    });

    return {
      message: "Session created successfully",
      stripeSession: stripeSession,
      status: HttpStatus.OK
    }
  }
}
