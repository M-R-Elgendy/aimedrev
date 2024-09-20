import { Injectable, HttpException, HttpStatus, ConflictException } from '@nestjs/common';
import { PrismaClient, User } from '@prisma/client'
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {

  private readonly prisma: PrismaClient = new PrismaClient();

  findAll() {
    return `This action returns all user`;
  }

  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findFirst({
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
          Paln: {
            select: {
              title: true,
              description: true,
              frequency: true,
              qeriesCount: true
            }
          }
        }
      });

      if (!user) throw new HttpException({ message: 'User not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
      if (user.isBlocked) throw new HttpException({ message: 'User is blocked, please contact us', status: HttpStatus.FORBIDDEN }, HttpStatus.FORBIDDEN);
      return user;

    } catch (error) {
      throw error;
    }
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  async remove(id: number) {
    return `This action removes a #${id} user`;
  }

  async block(id: string) {
    try {
      const user = await this.prisma.user.update({
        where: { id: id },
        data: { isBlocked: true }
      });
      return { message: 'User blocked successfully', status: HttpStatus.OK, user };
    } catch (error) {
      throw error;
    }
  }


}
