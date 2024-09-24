import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { AuthContext } from '../auth.context';
import { SessionToken } from '../../global/types';

@Injectable()
export class AuthGuard implements CanActivate {

    constructor(private readonly authContext: AuthContext) { }
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
            const payload = await this.jwtService.verifyAsync<SessionToken>(token, { secret: process.env.JWT_SECRET });
            (request as any).session = payload;
            this.authContext.setUser(payload);
        } catch (error: any) {
            console.log(error);
            throw new ForbiddenException('Invalid authorization token');
        }

        return true;
    }
}
