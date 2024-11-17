import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatOpenAI } from "@langchain/openai";
import * as fs from 'fs';

@Injectable()
export class OpenAIService {

    private llm: ChatOpenAI;
    private openai: OpenAI;

    constructor(
        private readonly configService: ConfigService
    ) {
        this.llm = new ChatOpenAI({
            model: "gpt-4o-2024-08-06",
            temperature: 0
        });

        this.openai = new OpenAI({
            apiKey: this.configService.getOrThrow('OPENAI_API_KEY'),
        });
    }

    getChatModel() {
        return this.llm;
    }

    async testService() {
        console.log('start')
        const response = await this.llm.invoke("Hello, world!");
        console.log(response)
        return response;
    }

    async transcribeAudio(filePath: string) {
        try {
            console.log('From service v-2')
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

    async query(prompot: string, chatHistory: any) {
        const completion = await this.openai.chat.completions.create({
            messages: [{ role: "user", content: prompot }, chatHistory],
            model: "gpt-4o",
            temperature: 0
        });

        return completion.choices[0].message.content;
    }

}
