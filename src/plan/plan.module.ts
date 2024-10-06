import { Module } from '@nestjs/common';
import { PlanService } from './plan.service';
import { PlanController } from './plan.controller';
import { StripeService } from 'src/stripe/stripe.service';

@Module({
  controllers: [PlanController],
  providers: [PlanService, StripeService],
})
export class PlanModule { }
