import {
  SubscribeMessage,
  WebSocketGateway,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AbstractGateway } from 'src/lib/abstract.gateway';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from 'src/auth/guards/ws.auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Roles } from '../global/decorators/role.decorator';
import { Role } from 'src/global/types';

// import { AddMessageDto } from './dto/add-message.dto';

@UseGuards(WsAuthGuard, RoleGuard)
@WebSocketGateway({ cors: { origin: '*' } })
@Roles([Role.ADMIN, Role.PAID_USER])
export class ChatGateway extends AbstractGateway {

  constructor(
    protected readonly jwtService: JwtService,
    protected readonly configService: ConfigService,
    // @Inject(forwardRef(() => MessagesService))
    // private readonly messagesService: MessagesService,
  ) {
    super(jwtService, configService);
  }

  @SubscribeMessage('chat')
  handleMessage(
    @MessageBody() payload: { author: string, body: any },
    @ConnectedSocket() client: Socket
  ): { author: string, body: any } {
    client.emit('chat', payload);
    return payload;
  }
}