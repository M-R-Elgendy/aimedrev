// import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';
// import { SessionToken } from '../types';
// import { ConfigService } from '@nestjs/config';
// import { AuthContext } from '../auth.context';
// import { Socket } from 'socket.io';
// import { WsException } from '@nestjs/websockets';

// @Injectable()
// export class WsAuthGuard implements CanActivate {
// 	constructor(
// 		private jwtService: JwtService,
// 		private configService: ConfigService,
// 		private authContext: AuthContext,
// 	) { }

// 	async canActivate(ctx: ExecutionContext) {
// 		const request = ctx.switchToWs().getClient<Socket>();
// 		const token = request.handshake.headers?.authorization?.split(' ') || [];
// 		if (token[0]?.toLocaleLowerCase() !== 'bearer') {
// 			throw new WsException('Bearer token malformed');
// 		}
// 		if (!token[1]) {
// 			throw new WsException('Authorization token missing');
// 		}

// 		try {
// 			const payload = await this.jwtService.verifyAsync<SessionToken>(token[1], {
// 				secret: this.configService.getOrThrow('JWT_SECRET'),
// 			});
// 			request['session'] = payload;
// 			this.authContext.setUser(request['session']);
// 		} catch (error: any) {
// 			throw new WsException('Authorization token malformed');
// 		}
// 		return true;
// 	}
// }
