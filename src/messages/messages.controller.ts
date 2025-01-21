import { Controller, Post, Body, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { MessagesService } from './messages.service';
import { CreateMessageDto, SummeryEvaluationDto } from './dto/create-message.dto';
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
  async createGeneralMessage(@Body() createMessageDto: CreateMessageDto, @Res() res: Response) {

    res.setHeader('Content-Type', 'text/plain;charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    /* const response = await */ this.messagesService.createGeneralMessage(createMessageDto, res);
    // return response;
  }

  @Post('/diagnostic')
  @Roles([Role.ADMIN, Role.PAID_USER])
  async createDiagnosticMessage(@Body() createMessageDto: CreateMessageDto, @Res() res: Response) {

    res.setHeader('Content-Type', 'text/plain;charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    /* const response = await */ this.messagesService.createDiagnosticMessage(createMessageDto, res);
    // return response;

  }

  @Post('/evidence')
  @Roles([Role.ADMIN, Role.PAID_USER])
  async createEvidenceMessage(@Body() createMessageDto: CreateMessageDto, @Res() res: Response) {

    res.setHeader('Content-Type', 'text/plain;charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    /* const response = await */ this.messagesService.createEvidenceMessage(createMessageDto, res);
    // return response;

  }

  @Post('summary-evaluation')
  @Roles([Role.ADMIN, Role.PAID_USER])
  async createCaseMessage(@Body() summeryEvaluationDto: SummeryEvaluationDto) {
    return this.messagesService.summaryEvaluation(summeryEvaluationDto)
  }

}
