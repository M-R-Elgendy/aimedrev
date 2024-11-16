import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatOpenAI } from "@langchain/openai";
// import { ConversationSummaryBufferMemory } from "langchain/memory";
// import { ChatPromptTemplate, MessagesPlaceholder, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
// import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
// import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
// import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
// import { Calculator } from "@langchain/community/tools/calculator";
// import { ExaSearchResults } from "@langchain/exa";
// import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
// import { AgentExecutor, createOpenAIToolsAgent, createToolCallingAgent } from "langchain/agents";


import * as fs from 'fs';

@Injectable()
export class OpenAIServiceV2 {

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
