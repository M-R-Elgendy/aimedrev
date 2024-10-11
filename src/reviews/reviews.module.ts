import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, PrismaClient],
})
export class ReviewsModule { }
