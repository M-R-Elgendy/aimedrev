import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { AuthContext } from 'src/auth/auth.context';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { OpenAIService } from 'src/openai/openai.service';
@Module({
  controllers: [MessagesController],
  providers: [MessagesService, AuthContext, PrismaClient, JwtService, MessagesGateway, OpenAIService],
})
export class MessagesModule { }
