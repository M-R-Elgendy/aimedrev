import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AuthContext } from 'src/auth/auth.context';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [ChatController],
  providers: [ChatService, AuthContext, PrismaClient],
})
export class ChatModule { }
