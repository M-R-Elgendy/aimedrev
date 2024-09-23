import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TransactionService {

  private readonly prismaClient = new PrismaClient();

  async create(createTransactionDto: CreateTransactionDto) {
    try {
      const createdTransaction = await this.prismaClient.transaction.create({ data: createTransactionDto });
      return createdTransaction;
    } catch (error) {
      throw error;
    }
  }

  findAll() {
    return `This action returns all transaction`;
  }

  findOne(id: number) {
    return `This action returns a #${id} transaction`;
  }

  update(id: string, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }
}
