import {
  SubscribeMessage,
  WebSocketGateway,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards, forwardRef, Inject, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AbstractGateway } from 'src/lib/abstract.gateway';
import { Socket } from 'socket.io';
import { WsAuthGuard } from 'src/auth/guards/ws.auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Roles } from '../global/decorators/role.decorator';
import { Role } from 'src/global/types';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';

@UseGuards(WsAuthGuard, RoleGuard)
@WebSocketGateway({ cors: { origin: '*' } })
@Roles([Role.ADMIN, Role.PAID_USER])
export class MessagesGateway extends AbstractGateway {

  constructor(
    protected readonly jwtService: JwtService,
    protected readonly configService: ConfigService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
  ) {
    super(jwtService, configService);
  }

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() payload: string,
    @ConnectedSocket() client: Socket
  ) {
    const parsedMessage: CreateMessageDto = JSON.parse(payload);
    const message = this.messagesService.create(parsedMessage);
    client.emit('message', "message");
    return payload;
  }
}