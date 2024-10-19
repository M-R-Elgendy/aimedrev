import { Module } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { FileUploadController } from './file-upload.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [ConfigModule],
  controllers: [FileUploadController],
  providers: [FileUploadService, PrismaClient],
})
export class FileUploadModule { }