import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { PlanService } from 'src/plan/plan.service';
import { StripeService } from 'src/stripe/stripe.service';
import { PrismaClient } from '@prisma/client';
import { AuthContext } from 'src/auth/auth.context';
import { Utlis } from 'src/global/utlis';
import { AxiosService } from 'src/axios/axios.service';
import { RefundService } from 'src/refund/refund.service';
import { UserService } from 'src/user/user.service';

@Module({
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    PlanService,
    StripeService,
    PrismaClient,
    AuthContext,
    Utlis,
    AxiosService,
    RefundService,
    UserService
  ],
})
export class SubscriptionModule { }
