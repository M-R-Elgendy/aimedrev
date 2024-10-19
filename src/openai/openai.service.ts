import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';

@Injectable()
export class OpenAIService {
    private openai: OpenAI;

    constructor(
        private readonly configService: ConfigService
    ) {
        this.openai = new OpenAI({
            apiKey: this.configService.getOrThrow('OPENAI_API_KEY'),
        });
    }

    async transcribeAudio(filePath: string) {
        try {
            const fileStream = fs.createReadStream(filePath);
            const response = await this.openai.audio.transcriptions.create({
                file: fileStream as any,
                model: 'whisper-1',
                language: 'en',
            });

            return {
                message: "Data processed successfully",
                statusCode: HttpStatus.OK,
                data: {
                    transcription: response.text
                }
            };
        } catch (error) {
            console.error('Error in transcription:', error.response?.data || error.message);
            throw new Error('Failed to transcribe the audio file.');
        }
    }


}
