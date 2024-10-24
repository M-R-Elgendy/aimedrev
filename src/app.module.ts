import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AxiosService } from './axios/axios.service';
import { AuthModule } from './auth/auth.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { PlanModule } from './plan/plan.module';
import { StripeService } from './stripe/stripe.service';
import { CountryModule } from './country/country.module';
import { TransactionModule } from './transaction/transaction.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { AuthContextModule } from './auth/auth.context';
import { ReviewsModule } from './reviews/reviews.module';
import { StripeController } from './stripe/stripe.controller';
import { StripeModule } from './stripe/stripe.module';
import { PrismaClient } from '@prisma/client';
import { PlanService } from './plan/plan.service';
import { SubscriptionService } from './subscription/subscription.service';
import { AuthContext } from './auth/auth.context';
import { Utlis } from './global/utlis';
import { RefundModule } from './refund/refund.module';
import { RefundService } from './refund/refund.service';
import { TranscriptionModule } from './transcription/transcription.module';
import { OpenAIService } from './openai/openai.service';
import { FileUploadModule } from './file-upload/file-upload.module';
import { ChatModule } from './chat/chat.module';
import { ChatService } from './chat/chat.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('SMTP_HOST'),
          port: +configService.get<number>('SMTP_PORT') || 587,
          secure: configService.get<number>('SMTP_PORT') === 465,
          auth: {
            user: configService.get<string>('SUPPORT_EMAIL'),
            pass: configService.get<string>('BREVO_API_KEY'),
          },
        },
        defaults: {
          from: '"No Reply" <no-reply@aimedrev.com>',
        },
      }),
      inject: [ConfigService],
    }),

    UserModule,
    AuthModule,
    PlanModule,
    CountryModule,
    TransactionModule,
    SubscriptionModule,
    AuthContextModule,
    ReviewsModule,
    StripeModule,
    RefundModule,
    TranscriptionModule,
    FileUploadModule,
    ChatModule
  ],
  controllers: [AppController, StripeController],
  providers: [
    AppService,
    AxiosService,
    StripeService,
    PrismaClient,
    PlanService,
    SubscriptionService,
    AuthContext,
    Utlis,
    RefundService,
    OpenAIService,
    ChatService
  ],

})
export class AppModule { }
