import {
    BadRequestException,
    UseFilters,
    UsePipes,
    ValidationError,
    ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebsocketExceptionsFilter } from '../global/filters/ws-exception.filter';
import { CreateChatDto } from '../chat/dto/create-chat.dto';

export type WebSocketMessage = Partial<CreateChatDto>;

@WebSocketGateway()
@UseFilters(WebsocketExceptionsFilter)
@UsePipes(
    new ValidationPipe({
        whitelist: true,
        transform: true,
        exceptionFactory: (errors: ValidationError[]) => {
            const messages = [];
            errors.forEach((e) => {
                Object.values(e.constraints).forEach((m) => messages.push(m));
            });
            throw new BadRequestException(messages.join('. '));
        },
    }),
)
export abstract class AbstractGateway
    implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        protected readonly jwtService: JwtService,
        protected readonly configService: ConfigService,
    ) { }

    @WebSocketServer()
    protected server: Server;
    // TODO: Save sockets in a more efficient way, also to handle load balancing
    userSocketMap = new Map<number, string[]>();
    socketUserMap = new Map<string, number>();

    async handleConnection(client: Socket) {
        // using wsAuthGuard with @useGuards decorator doesn't seem to work on handleConnection, it only worked when allowing to recive a messsage from the user is there a way to make it work?
        const token = client.handshake.headers?.authorization?.split(' ') || [];
        if (token[0]?.toLocaleLowerCase() !== 'bearer' || !token[1]) {
            client.disconnect();
        }

        try {
            const payload = await this.jwtService.verifyAsync(token[1], {
                secret: this.configService.get('JWT_SECRET'),
            });
            const userId = payload.sub;
            if (!this.userSocketMap.has(userId)) {
                this.userSocketMap.set(userId, []);
            }
            this.userSocketMap.get(userId).push(client.id);
            this.socketUserMap.set(client.id, userId);
        } catch (error: any) {
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const userId = this.socketUserMap.get(client.id);
        const userSockets = this.userSocketMap.get(userId);
        const socketId = client.id;
        const index = userSockets.indexOf(socketId);
        if (index !== -1) {
            userSockets.splice(index, 1);
        }
        this.socketUserMap.delete(socketId);
    }
    protected async emitMessage(
        userId: number,
        eventName: string,
        message: WebSocketMessage,
    ) {
        const userSockets = this.userSocketMap.get(userId);
        if (!userSockets) {
            return;
        }
        for (const socketId of userSockets) {
            // TODO: add timeout to remove socket if it doesn't respond
            this.server.to(socketId).emit(eventName, message);
        }
    }
}
