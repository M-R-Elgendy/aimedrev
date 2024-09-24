import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { Roles } from '../../global/decorators/role.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    async canActivate(ctx: ExecutionContext): Promise<boolean> {

        const roles = this.reflector.get(Roles, ctx.getHandler());
        if (!roles) return true;


        const request = ctx.switchToHttp().getRequest<FastifyRequest>();
        const userRole = (request as any).session?.role;

        if (!userRole) throw new ForbiddenException('User role is missing in session');

        if (!roles.includes(userRole) && roles[0] !== '*') {
            throw new ForbiddenException('You are not allowed to use this endpoint');
        }

        return true;
    }
}
