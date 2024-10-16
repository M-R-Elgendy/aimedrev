import { Module, MiddlewareConsumer } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { PlanService } from 'src/plan/plan.service';
import { Utlis } from 'src/global/utlis';
import { AxiosService } from 'src/axios/axios.service';
import { RefundService } from 'src/refund/refund.service';
// import { RawBodyMiddleware } from 'src/global/middleware/rawBodyMiddleware';

@Module({
    controllers: [StripeController],
    providers: [StripeService, PrismaClient, SubscriptionService, PlanService, Utlis, AxiosService, RefundService],
})
export class StripeModule { }
