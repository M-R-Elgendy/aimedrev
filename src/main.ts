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

  const st = new StripeService();
  // console.log(await st.createProduct({
  //   name: 'test',
  //   description: 'test',
  //   active: true,  // Ensure product is active
  //   metadata: {
  //     key: 'value'
  //   },
  //   default_price_data: {
  //     currency: 'usd',
  //     unit_amount: 100, // Ensure this is in the smallest currency unit (cents for USD)
  //     recurring: {
  //       interval: 'month',
  //     },
  //     tax_behavior: 'inclusive', // Add this to specify tax behavior (optional)
  //   },
  //   expand: ['default_price'], // This ensures the default price is created and linked properly
  // }))
  // // console.log(await st.getProduct('prod_QyrzGgrtHMAPzn'))
  // const products = (await st.getProduct('prod_QysKU3l3YFyunf'))
  // console.log(await st.getProductPrices('prod_QysKU3l3YFyunf'))
  // console.log(products)
  // // Print products ids
  // products.forEach((product) => {
  //   console.log(product.id);
  // });

  await app.listen(process.env.PORT || 3000);
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
  console.warn('File upload modules')
}
bootstrap();
