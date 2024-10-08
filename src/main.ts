import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GeneralExceptionFilter } from './global/filters/exception.filter';
import { BadRequestException, ValidationPipe, VersioningType } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { StripeService } from './stripe/stripe.service';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
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

  // const st = new StripeService();
  // console.log(await st.createSubscription({
  //   client_reference_id: "",
  //   customer_email: '',
  //   success_url: `${process.env.PAYMENT_SUCCESS_CALLBACK_PATH}/${123 * 10}`,
  //   cancel_url: process.env.PAYMENT_CANCEL_CALLBACK,
  //   items: [
  //     {
  //       price: 'price_1Q6vUDHGXGocVbgeypnPt5SG'
  //     },
  //   ],
  // }))

  await app.listen(process.env.PORT || 3000);
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
  console.warn('File upload modules')
}
bootstrap();
