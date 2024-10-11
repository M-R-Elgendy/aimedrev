import { Injectable, HttpStatus, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client'
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthContext } from 'src/auth/auth.context';
import { StripeService } from 'src/stripe/stripe.service';
import Stripe from 'stripe';
@Injectable()
export class UserService {

  constructor(
    private readonly prisma: PrismaClient,
    private readonly stripeService: StripeService,
    private readonly authContext: AuthContext
  ) { }

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  async findAll() {
    try {
      const data = await this.prisma.user.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          speciality: true,
          paidUser: true,
          activeUntil: true,
          role: true,
          emailVerified: true,
          phoneVerified: true,
          socialProvider: true,
          isBlocked: true,
          googleData: {
            select: {
              picture: true
            }
          },
          Country: {
            select: {
              name: true,
              phoneCode: true,
              ISOCode: true
            }
          },
          Plan: {
            select: {
              title: true,
              description: true,
              frequency: true,
              qeriesCount: true
            }
          }
        }
      });

      return {
        message: 'User found successfully',
        statusCode: HttpStatus.OK,
        data
      };

    } catch (error) {
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: id, isDeleted: false },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          speciality: true,
          paidUser: true,
          activeUntil: true,
          role: true,
          emailVerified: true,
          phoneVerified: true,
          socialProvider: true,
          isBlocked: true,
          googleData: {
            select: {
              picture: true
            }
          },
          Country: {
            select: {
              name: true,
              phoneCode: true,
              ISOCode: true
            }
          },
          Plan: {
            select: {
              title: true,
              description: true,
              frequency: true,
              qeriesCount: true
            }
          }
        }
      });

      if (!user) throw new NotFoundException('User not found');

      return {
        message: 'User found successfully',
        statusCode: HttpStatus.OK,
        data: user
      };

    } catch (error) {
      throw error;
    }
  }

  async update(updateUserDto: UpdateUserDto) {
    try {
      const id = this.authContext.getUser().id;
      const user = await this.prisma.user.findUnique({ where: { id: id } });

      let isNewEmail = false, isNewPhone = false;
      if (updateUserDto.email !== user.email || updateUserDto.phone !== user.phone) {

        isNewEmail = updateUserDto.email !== user.email;
        isNewPhone = updateUserDto.phone !== user.phone;

        const isDataDuplicated = await this.prisma.user.findFirst({
          where: {
            OR: [{ email: updateUserDto.email }, { phone: updateUserDto.phone }],
            NOT: { id: id }
          }
        });

        if (isDataDuplicated) throw new ConflictException('Email or phone already exist');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: id },
        data: { ...updateUserDto, emailVerified: !isNewEmail, phoneVerified: !isNewPhone },
        select: { id: true, name: true, email: true, autoRenewal: true, stripeCustomerId: true }
      });

      const activeSubscription: Stripe.Subscription = await this.stripeService.getLastActiveSubscription(updatedUser.stripeCustomerId);
      if (activeSubscription)
        await this.stripeService.renewSubscription(activeSubscription.id, updatedUser.autoRenewal);


      return { message: `User updated successfully`, statusCode: HttpStatus.OK, data: updatedUser };
    } catch (error) {
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id);
      const user = await this.prisma.user.update({
        where: { id: id },
        data: { isDeleted: true },
        select: { id: true, name: true, email: true }
      });
      return { message: `User deleted successfully`, statusCode: HttpStatus.OK, data: user };
    } catch (error) {
      throw error;
    }
  }

  async accountStatus(id: string, suspend: boolean) {
    try {
      await this.findOne(id);
      const user = await this.prisma.user.update({
        where: { id: id },
        data: { isBlocked: suspend },
        select: { id: true, name: true, email: true }
      });
      return { message: `User ${suspend ? '' : 'un'}suspended successfully`, statusCode: HttpStatus.OK, data: user };
    } catch (error) {
      throw error;
    }
  }

}
