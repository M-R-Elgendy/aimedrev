import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    InternalServerErrorException,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class GeneralExceptionFilter implements ExceptionFilter {
    constructor() { }

    catch(exception: HttpException | Error, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<FastifyReply>();
        const request = ctx.getRequest<FastifyRequest>();

        console.error(`Timestamp: ${new Date().toISOString()}. Message: ${exception.message}. Stacktrace: ${exception.stack}`,);
        console.error(`Request body, `, { body: request.body });

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            return response.status(status).send(exception.getResponse());
        }

        return response
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .send(
                new InternalServerErrorException(
                    'Internal server errror. please report issue to the support team.',
                ).getResponse(),
            );

    }
}