import { Injectable, HttpStatus, NotFoundException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaClient } from '@prisma/client';
import { AuthContext } from 'src/auth/auth.context';

@Injectable()
export class TransactionService {

  constructor(
    private readonly prismaClient: PrismaClient,
    private readonly authContext: AuthContext
  ) { }

  async create(createTransactionDto: CreateTransactionDto) {
    try {
      const createdTransaction = await this.prismaClient.transaction.create({ data: createTransactionDto });
      return createdTransaction;
    } catch (error) {
      throw error;
    }
  }

  async findAll(userRequest = false) {
    try {

      const userId = this.authContext.getUser().id;

      const query = { isDeleted: false };
      if (userRequest) query['userId'] = userId


      const data = await this.prismaClient.transaction.findMany({
        where: { ...query },
        select: {
          id: true,
          paymentMethod: true,
          tran_ref: true,
          amount: true,
          currency: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              googleData: {
                select: {
                  picture: true
                }
              }
            }
          },
          plan: {
            select: {
              id: true,
              title: true,
              egPrice: true,
              globalPrice: true,
              description: true
            }
          },
          Subscription: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              totalQueries: true,
              usedQuries: true,
              isActive: true
            }
          }
        }
      });

      return {
        message: 'Transactions fetched successfully',
        statusCode: HttpStatus.OK,
        data
      }

    } catch (error) {
      throw error;
    }
  }

  async findOne(id: string, userRequest = false) {
    try {
      const userId = this.authContext.getUser().id;

      const query = { id: id, isDeleted: false };
      if (userRequest) query['userId'] = userId

      const data = await this.prismaClient.transaction.findUnique({
        where: { ...query },
        select: {
          id: true,
          paymentMethod: true,
          tran_ref: true,
          amount: true,
          currency: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              googleData: {
                select: {
                  picture: true
                }
              }
            }
          },
          plan: {
            select: {
              id: true,
              title: true,
              egPrice: true,
              globalPrice: true,
              description: true
            }
          },
          Subscription: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              totalQueries: true,
              usedQuries: true,
              isActive: true
            }
          }
        }
      });

      if (!data) throw new NotFoundException("Transaction not found");

      return {
        message: 'Transactions fetched successfully',
        statusCode: HttpStatus.OK,
        data
      }

    } catch (error) {
      throw error;
    }
  }

  update(id: string, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }
}
