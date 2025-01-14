import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthContext } from 'src/auth/auth.context';
import { StripeService } from 'src/stripe/stripe.service';
import { PrismaClient } from '@prisma/client'
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { AxiosService } from 'src/axios/axios.service';
import { Utlis } from 'src/global/utlis';
@Module({
  controllers: [UserController],
  providers: [UserService, AuthContext, StripeService, PrismaClient, AuthService, JwtService, AxiosService, Utlis],
})
export class UserModule { }
