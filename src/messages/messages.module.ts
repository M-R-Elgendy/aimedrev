import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { AuthContext } from 'src/auth/auth.context';
import { PrismaClient } from '@prisma/client';
import { OpenAIService } from 'src/openai/openai.service';
import { OpenAIServiceV2 } from 'src/openai/openai.service-v2';
import { UserService } from 'src/user/user.service';
import { Utlis } from 'src/global/utlis';
import { StripeService } from 'src/stripe/stripe.service';
import { AxiosService } from 'src/axios/axios.service';
import { MarkdownService } from 'src/markdown/markdown.service';
@Module({
  controllers: [MessagesController],
  providers: [
    MessagesService,
    AuthContext,
    PrismaClient,
    OpenAIService,
    OpenAIServiceV2,
    UserService,
    Utlis,
    StripeService,
    AxiosService,
    MarkdownService
  ],
})
export class MessagesModule { }
