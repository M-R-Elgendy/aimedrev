import { Injectable } from '@nestjs/common';
import { CreateRefundDto } from './dto/create-refund.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';
import { PrismaClient } from '@prisma/client';

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

  findAll() {
    return `This action returns all refund`;
  }

  findOne(id: number) {
    return `This action returns a #${id} refund`;
  }

  update(id: number, updateRefundDto: UpdateRefundDto) {
    return `This action updates a #${id} refund`;
  }

  remove(id: number) {
    return `This action removes a #${id} refund`;
  }
}
