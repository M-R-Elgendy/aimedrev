import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { UserService } from 'src/user/user.service';
import { StripeService } from 'src/stripe/stripe.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client'
import { AxiosService } from '../axios/axios.service';
// import { Utlis } from 'src/global/utlis';

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    StripeService,
    JwtService,
    AxiosService,
    // Utlis,
    PrismaClient
  ],
})
export class AuthModule { }
