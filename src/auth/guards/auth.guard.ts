import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { AuthContext } from '../auth.context';
import { SessionToken } from '../../global/types';
import { PrismaClient } from '@prisma/client';
@Injectable()
export class AuthGuard implements CanActivate {

    constructor(
        private readonly authContext: AuthContext,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaClient
    ) { }
    private readonly jwtService: JwtService = new JwtService();

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const request = ctx.switchToHttp().getRequest<FastifyRequest>();
        const authHeader = request.headers?.authorization;

        if (!authHeader) {
            throw new ForbiddenException('Authorization header missing');
        }

        const [scheme, token] = authHeader.split(' ');
        if (scheme?.toLowerCase() !== 'bearer' || !token) {
            throw new ForbiddenException('Bearer token malformed or missing');
        }

        try {
            const payload = await this.jwtService.verifyAsync<SessionToken>(token, { secret: this.configService.getOrThrow('JWT_SECRET') });

            const user = await this.prisma.user.findUnique({ where: { id: payload.id, isDeleted: false } });

            if (!user) throw new ForbiddenException('User not found');
            if (user.isBlocked || user.isDeleted) throw new ForbiddenException('User may be blocked. Please contact the support team');

            (request as any).session = payload;
            payload.IP = request.ip;
            this.authContext.setUser(payload);
        } catch (error: any) {
            console.log(error);
            throw new ForbiddenException('Invalid authorization token');
        }

        return true;
    }
}
