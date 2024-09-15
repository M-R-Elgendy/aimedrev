import { Injectable, HttpException, HttpStatus, ConflictException } from '@nestjs/common';
import { PrismaClient, User } from '@prisma/client'
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AxiosService } from '../axios/axios.service';
import { compareSync, hashSync } from 'bcrypt';
import { GoogleAuthDto } from './dto/google-auth.dto';

@Injectable()
export class UserService {

  private readonly prisma: PrismaClient = new PrismaClient();
  private readonly axiosService: AxiosService = new AxiosService();

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
          password: await this.hashPassword(createUserDto.password),
          countryId: createUserDto.country || null,
          speciality: createUserDto.speciality || null
        }
      });

      return {
        message: 'User created successfully',
        user: this.removeExtraAttrs([user])[0],
        status: HttpStatus.CREATED

      };

    } catch (error) {
      throw error;
    }
  }

  async googleAuth(googleAuthDto: GoogleAuthDto) {
    const accessToken = googleAuthDto.accessToken;

    const headers = {
      "Content-Type": "application/json",
      'Authorization': `Bearer ${accessToken}`
    };
    const googleUser = await this.axiosService.get(accessToken, headers);

    if (googleUser.status !== 200) {
      throw new HttpException(googleUser.data, googleUser.status);
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email: googleUser.data.email
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

  private async hashPassword(password: string): Promise<string> {
    try {
      const hash = await hashSync(password, +process.env.SALT_ROUNDS);
      return hash;
    } catch (error) {
      throw new Error('Error hashing password');
    }
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isMatch = await compareSync(password, hash);
      return isMatch;
    } catch (error) {
      throw new Error('Error verifying password');
    }
  }

  private removeExtraAttrs(users: User[]) {

    return users.map(user => {
      delete user.password;
      delete user.code;
      delete user.createdAt;
      delete user.updatedAt;
      delete user.token;
      return user;
    });

  }
}
