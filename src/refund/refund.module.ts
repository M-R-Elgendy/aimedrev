import { Module } from '@nestjs/common';
import { RefundService } from './refund.service';
import { RefundController } from './refund.controller';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [RefundController],
  providers: [RefundService, PrismaClient],
})
export class RefundModule { }
