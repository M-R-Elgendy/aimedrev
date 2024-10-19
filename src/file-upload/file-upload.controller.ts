import { Controller, Post, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'src/auth/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('file')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) { }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file')) // The field name for the file input
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return await this.fileUploadService.uploadFile(file);
  }
}
