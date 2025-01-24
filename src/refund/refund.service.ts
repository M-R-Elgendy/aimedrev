import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRefundDto } from './dto/create-refund.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';
import { PrismaClient, REFUND_STATUS } from '@prisma/client';

@Injectable()
export class RefundService {

  constructor(private prisma: PrismaClient) { }

  create(createRefundDto: CreateRefundDto) {
    try {
      return this.prisma.refund.create({
        data: createRefundDto,
      });
    } catch (error) {
      throw error;
    }
  }

  async findAll() {
    try {
      const refunds = await this.prisma.refund.findMany({ orderBy: { id: 'desc' } });
      return {
        message: "Refunds fetched successfully",
        data: refunds,
        statusCode: HttpStatus.OK
      }
    } catch (error) {
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const refund = await this.prisma.refund.findFirst({
        where: { id: id },
      });

      if (!refund) throw new NotFoundException('Refund not found');

      return {
        message: "Refund fetched successfully",
        data: refund,
        statusCode: HttpStatus.OK
      }

    } catch (error) {
      throw error;
    }
  }

  async update(paymentIntentId: string, status: REFUND_STATUS, refundedAmount: number) {
    try {
      const refund = await this.prisma.refund.findFirst({
        where: { paymentIntentId: paymentIntentId },
      });

      if (!refund) throw new NotFoundException('Refund not found');

      return this.prisma.refund.update({
        where: { paymentIntentId: paymentIntentId },
        data: {
          refundStatus: status,
          refundAmount: refundedAmount
        }
      });
    } catch (error) {
      throw error;
    }
  }
}
