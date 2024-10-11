import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { PlanService } from 'src/plan/plan.service';

@Module({
    controllers: [StripeController],
    providers: [StripeService, PrismaClient, SubscriptionService, PlanService],
})
export class StripeModule { }
