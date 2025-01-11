import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GeneralExceptionFilter } from './global/filters/exception.filter';
import { BadRequestException, ValidationPipe, VersioningType } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,  
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = [];
        errors.forEach((e) => {
          Object.values(e.constraints ?? []).forEach((m) => messages.push(m));
          e.children?.forEach((child) => {
            Object.values(child.constraints ?? []).forEach((m) => messages.push(m));
            child.children?.forEach((c) => {
              Object.values(c.constraints ?? []).forEach((m) => messages.push(m));
            });
          });
        });
        throw new BadRequestException(messages.join('. '));
      },
    }),
  );

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalFilters(new GeneralExceptionFilter());

  app.use('/api/v1/stripe/webhook', bodyParser.raw({ type: 'application/json' }));

  await app.listen(process.env.PORT || 3000);
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
}
bootstrap();
