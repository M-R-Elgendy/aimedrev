import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { AuthContext } from 'src/auth/auth.context';
import { PrismaClient } from '@prisma/client';
import { OpenAIService } from 'src/openai/openai.service';
import { UserService } from 'src/user/user.service';
import { Utlis } from 'src/global/utlis';
import { StripeService } from 'src/stripe/stripe.service';
import { AxiosService } from 'src/axios/axios.service';
import { MessagesUtlis } from './utlis/utlis';
@Module({
  controllers: [MessagesController],
  providers: [
    MessagesService,
    AuthContext,
    PrismaClient,
    OpenAIService,
    UserService,
    Utlis,
    StripeService,
    AxiosService,
    MessagesUtlis
  ],
})
export class MessagesModule { }
