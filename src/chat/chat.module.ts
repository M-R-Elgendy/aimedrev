import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AuthContext } from 'src/auth/auth.context';
import { PrismaClient } from '@prisma/client';
import { ChatGateway } from './chat.gateway';
import { JwtService } from '@nestjs/jwt';
@Module({
  controllers: [ChatController],
  providers: [ChatService, AuthContext, PrismaClient, ChatGateway, JwtService],
})
export class ChatModule { }
