import { Module } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';
import { TranscriptionController } from './transcription.controller';
import { OpenAIService } from 'src/openai/openai.service';
import { OpenAIServiceV2 } from 'src/openai/openai.service-v2';

@Module({
  controllers: [TranscriptionController],
  providers: [TranscriptionService, OpenAIServiceV2],
})
export class TranscriptionModule { }
