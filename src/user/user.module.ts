import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthContext } from 'src/auth/auth.context';
import { StripeService } from 'src/stripe/stripe.service';
import { PrismaClient } from '@prisma/client'

@Module({
  controllers: [UserController],
  providers: [UserService, AuthContext, StripeService, PrismaClient],
})
export class UserModule { }
