import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { AuthContext } from 'src/auth/auth.context';
import { PrismaClient, CHAT_TYPES } from '@prisma/client';

@Injectable()
export class ChatService {

  constructor(
    private readonly prisma: PrismaClient,
    private readonly authContext: AuthContext
  ) { }

  async create(createChatDto: CreateChatDto) {
    try {
      const createdChat = await this.prisma.chat.create({
        data: {
          type: createChatDto.type,
          userId: this.authContext.getUser().id,
        },
      });

      return {
        message: "Chat created successfully",
        dats: {
          chatType: createdChat.type,
          chatId: createdChat.id
        },
        statusCode: HttpStatus.CREATED
      }
    } catch (error) {
      return error;
    }
  }

  async findAll(filter: CHAT_TYPES) {
    console.log(filter)
    try {
      const chats = await this.prisma.chat.findMany({
        where: {
          userId: this.authContext.getUser().id,
          isDeleted: false,
          type: filter
        },
        select: {
          id: true,
          type: true,
          title: true,
          messages: true,
        }
      });

      return {
        message: "Chats fetched successfully",
        data: { chats },
        statusCode: HttpStatus.OK
      }
    } catch (error) {
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const chat = await this.prisma.chat.findFirst({
        where: {
          id: id,
          userId: this.authContext.getUser().id,
          isDeleted: false,
        },
        select: {
          id: true,
          type: true,
          title: true,
          messages: true,
        }
      });

      if (!chat) throw new NotFoundException('Chat not found');
      return {
        message: "Chats fetched successfully",
        data: { chat },
        statusCode: HttpStatus.OK
      }
    } catch (error) {
      throw error;
    }
  }

  async update(id: string, updateChatDto: UpdateChatDto) {
    return `This action updates a #${id} chat`;
  }

  async remove(id: string) {
    try {
      const chat = await this.prisma.chat.findFirst({
        where: {
          id: id,
          userId: this.authContext.getUser().id,
          isDeleted: false,
        },
        select: {
          id: true
        }
      });

      if (!chat) throw new NotFoundException('Chat not found');
      await this.prisma.chat.update({ where: { id: chat.id }, data: { isDeleted: true, deletedAt: new Date() } });
      return {
        message: "Chats deleted successfully",
        data: {},
        statusCode: HttpStatus.OK
      }
    } catch (error) {
      throw error;
    }
  }
}
