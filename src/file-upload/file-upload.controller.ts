import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) { }

  @Post('file')
  @UseInterceptors(FileInterceptor('file')) // The field name for the file input
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const uploadResponse = await this.fileUploadService.uploadFile(file);
    return {
      url: uploadResponse.Location, // Return the file URL
    };
  }
}
