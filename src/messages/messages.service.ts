import { Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { OpenAIService } from 'src/openai/openai.service';
import { PrismaClient } from '@prisma/client';
import { AuthContext } from 'src/auth/auth.context';

@Injectable()
export class MessagesService {

  constructor(
    private readonly prisma: PrismaClient,
    private readonly authContext: AuthContext,
    private readonly openaiService: OpenAIService,
  ) { }

  async create(createMessageDto: CreateMessageDto) {
    try {
      const userId = this.authContext.getUser().id;
      const chat = await this.prisma.chat.findUnique({
        where: {
          id: createMessageDto.chatId,
          userId: userId
        },
      });

      if (!chat) return { message: 'Chat not found', code: 400 };

      chat.messages.push({
        role: 'user',
        content: createMessageDto as object
      });

      return await this.prisma.chat.update({
        where: { id: chat.id },
        data: { messages: chat.messages }
      });

    } catch (e) {
      console.log(e);
    }
  }

  findAll() {
    return `This action returns all messages`;
  }

  findOne(id: number) {
    return `This action returns a #${id} message`;
  }

  update(id: number, updateMessageDto: UpdateMessageDto) {
    return `This action updates a #${id} message`;
  }

  remove(id: number) {
    return `This action removes a #${id} message`;
  }
}
