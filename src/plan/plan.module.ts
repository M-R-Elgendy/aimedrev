import { Module } from '@nestjs/common';
import { PlanService } from './plan.service';
import { PlanController } from './plan.controller';
import { StripeService } from 'src/stripe/stripe.service';
import { PrismaClient } from '@prisma/client';
import { Utlis } from 'src/global/utlis';
import { AxiosService } from 'src/axios/axios.service';
@Module({
  controllers: [PlanController],
  providers: [PlanService, StripeService, PrismaClient, Utlis, AxiosService],
})
export class PlanModule { }
