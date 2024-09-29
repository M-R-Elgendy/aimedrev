import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { AxiosService } from './axios/axios.service';
import { AuthModule } from './auth/auth.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { PlanModule } from './plan/plan.module';
import { RevenuecatService } from './revenuecat/revenuecat.service';
import { StripeService } from './stripe/stripe.service';
import { CountryModule } from './country/country.module';
import { TransactionModule } from './transaction/transaction.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { AuthContextModule } from './auth/auth.context';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),

    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST,
        port: +process.env.SMTP_PORT || 587,
        secure: (+process.env.SMTP_PORT == 465) ? true : false || false,
        auth: {
          user: process.env.SUPPORT_EMAIL,
          pass: process.env.BREVO_API_KEY,
        },
      },
      defaults: {
        from: '"No Reply" <no-reply@aimedrev.com>',
      }
    }),

    UserModule,
    AuthModule,
    PlanModule,
    CountryModule,
    TransactionModule,
    SubscriptionModule,
    AuthContextModule,
    ReviewsModule
  ],
  controllers: [AppController],
  providers: [AppService, AxiosService, RevenuecatService, StripeService],

})
export class AppModule { }
