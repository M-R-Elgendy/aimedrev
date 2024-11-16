import { Controller, Post, Body, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Roles } from '../global/decorators/role.decorator';
import { Role } from 'src/global/types';

@UseGuards(AuthGuard, RoleGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) { }

  @Post()
  @Roles([Role.ADMIN, Role.PAID_USER])
  async create(@Body() createMessageDto: CreateMessageDto) {

    // res.setHeader('Content-Type', 'text/event-stream');
    // res.setHeader('Cache-Control', 'no-cache');
    // res.setHeader('Connection', 'keep-alive');

    const response = await this.messagesService.create(createMessageDto);
    return response;

    // res.write(`${JSON.stringify(response)}`);
    // res.end();
  }

}
