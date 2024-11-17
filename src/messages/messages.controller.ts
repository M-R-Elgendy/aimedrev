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

  @Post('/general')
  @Roles([Role.ADMIN, Role.PAID_USER])
  async createGeneralMessage(@Body() createMessageDto: CreateMessageDto) {

    // res.setHeader('Content-Type', 'text/event-stream');
    // res.setHeader('Cache-Control', 'no-cache');
    // res.setHeader('Connection', 'keep-alive');

    const response = await this.messagesService.createGeneralMessage(createMessageDto);
    return response;

    // res.write(`${JSON.stringify(response)}`);
    // res.end();
  }

  @Post('/diagnostic')
  @Roles([Role.ADMIN, Role.PAID_USER])
  async createDiagnosticMessage(@Body() createMessageDto: CreateMessageDto) {

    // res.setHeader('Content-Type', 'text/event-stream');
    // res.setHeader('Cache-Control', 'no-cache');
    // res.setHeader('Connection', 'keep-alive');

    const response = await this.messagesService.createDiagnosticMessage(createMessageDto);
    return response;

    // res.write(`${JSON.stringify(response)}`);
    // res.end();
  }

  @Post('/evidence')
  @Roles([Role.ADMIN, Role.PAID_USER])
  async createEvidenceMessage(@Body() createMessageDto: CreateMessageDto) {

    // res.setHeader('Content-Type', 'text/event-stream');
    // res.setHeader('Cache-Control', 'no-cache');
    // res.setHeader('Connection', 'keep-alive');

    const response = await this.messagesService.createEvidenceMessage(createMessageDto);
    return response;

    // res.write(`${JSON.stringify(response)}`);
    // res.end();
  }

}
