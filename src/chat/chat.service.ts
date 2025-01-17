import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CreateChatDto, } from './dto/create-chat.dto';
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
      const userId = this.authContext.getUser().id;
      const userName = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

      let welcomeMessage: string = '';
      if (createChatDto.type === CHAT_TYPES.DIAGNOSTIC) {
        welcomeMessage = `Hello, Dr. ${userName.name}! To provide the most accurate and helpful recommendations, please share a comprehensive clinical case summary, including:\n\n` +
          '- **Age**\n' +
          '- **Sex**\n' +
          '- **Relevant past medical history**\n' +
          '- **Current medications**\n' +
          '- **Presenting symptoms**\n' +
          '- **Associated symptoms**\n' +
          '- **Descriptions of relevant studies** (e.g., lab results, imaging findings)\n' +
          '- **Details of the illness course**\n' +
          '- **Any additional information** you might share when consulting another physician\n\n' +
          'The more thorough the information, the better I can assist you.';
      } else {
        welcomeMessage = `Hi Dr. ${userName.name}! How can I assist you?`;
      }


      const createdChat = await this.prisma.chat.create({
        data: {
          type: createChatDto.type,
          userId: userId,
          messages: [{
            role: 'PhysAID',
            content: {
              message: welcomeMessage,
              images: [],
              pdfs: []
            }
          }]
        },
      });

      return {
        message: "Chat created successfully",
        dats: {
          chatType: createdChat.type,
          chatId: createdChat.id,
          messages: createdChat.messages
        },
        statusCode: HttpStatus.CREATED
      }
    } catch (error) {
      return error;
    }
  }

  async findAll(filter: CHAT_TYPES) {
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
          messages: false,
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
