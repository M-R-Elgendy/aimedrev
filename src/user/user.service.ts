import { Injectable, HttpException, HttpStatus, ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client'
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {

  private readonly prisma: PrismaClient = new PrismaClient();

  async emailSignUp(createUserDto: CreateUserDto) {

    try {

      const foundedUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: createUserDto.email },
            { phone: createUserDto.phone }
          ]
        },
        select: {
          id: true,
          name: true,
          countryId: true,
          speciality: true,
          createdAt: true,
          email: true,
          phone: true
        }
      });

      if (foundedUser) {
        throw new ConflictException({ message: 'User already exists', foundedUser, status: HttpStatus.CONFLICT });
      }

      const user = await this.prisma.user.create({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          phone: createUserDto.phone || null,
          password: createUserDto.password || null,
          countryId: createUserDto.country || null,
          speciality: createUserDto.speciality || null
        }
      });

      delete user.password;
      delete user.code;
      delete user.createdAt;
      delete user.updatedAt;

      // TODO: send email confirmation

      return user;

    } catch (error) {
      throw error;
    }
  }

  async googleAuth() {

  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
