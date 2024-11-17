import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OpenAIService } from 'src/openai/openai.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('transcribe')
export class TranscriptionController {
  constructor(private readonly openAIService: OpenAIService) { }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async transcribeAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    const uploadPath = path.join(__dirname, `../uploads/${file.originalname}`);
    fs.writeFileSync(uploadPath, file.buffer);

    try {
      const transcription = await this.openAIService.transcribeAudio(uploadPath);
      fs.unlinkSync(uploadPath);
      return { text: transcription };
    } catch (error) {
      throw new BadRequestException('Error processing the audio file');
    }
  }
}
