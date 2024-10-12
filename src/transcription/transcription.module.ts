import { Module } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';
import { TranscriptionController } from './transcription.controller';
import { OpenAIService } from 'src/openai/openai.service';

@Module({
  controllers: [TranscriptionController],
  providers: [TranscriptionService, OpenAIService],
})
export class TranscriptionModule { }
