import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

@Catch(WsException, HttpException, Error)
export class WebsocketExceptionsFilter extends BaseWsExceptionFilter {
	catch(exception: WsException | HttpException, host: ArgumentsHost) {
		const client = host.switchToWs().getClient();
		const data = host.switchToWs().getData();

		console.error(
			`[WS] Timestamp: ${new Date().toISOString()}. Message: ${exception.message}. Stacktrace: ${exception.stack}}`,
		);
		console.error(`Message, `, {
			...data,
		});

		const args = host.getArgs();
		const ACKCallback = args.reverse().find((a) => 'function' === typeof a);

		let response = {
			message: exception.message,
			error: exception.name,
		};
		if (!(exception instanceof HttpException || exception instanceof WsException)) {
			response = {
				message: 'Internal server errror. please report issue to the support team.',
				error: 'Internal Server Error',
			};
		}

		if (ACKCallback) ACKCallback(response);
		else client.emit('errors', response);
	}
}
