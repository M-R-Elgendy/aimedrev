import { Injectable } from '@nestjs/common';
import { CreateMessageDto, SummeryEvaluationDto } from './dto/create-message.dto';
import { ChatOpenAI } from "@langchain/openai";
import { CHAT_TYPES } from '@prisma/client';
import { Calculator } from "@langchain/community/tools/calculator";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { PythonInterpreterTool } from "@langchain/community/experimental/tools/pyinterpreter";
import { loadPyodide } from "pyodide";
import { ExaSearchResults } from '@langchain/exa';
import { Response } from 'express';
import { MessagesUtlis } from './utlis/utlis';
import { summrayEvRagOutputSchema } from './z-schemas/rag-output.schema';
import { OpenAIService } from 'src/openai/openai.service';
import Exa from 'exa-js';


@Injectable()
export class MessagesService {

  private readonly exa = new Exa(process.env.EXA_API_KEY);
  constructor(
    private readonly messagesUtlis: MessagesUtlis,
    private readonly openaiService: OpenAIService
  ) { }

  async createGeneralMessage(createMessageDto: CreateMessageDto, res: Response) {

    try {

      const { chat, subscription } = await this.messagesUtlis.validateUserChatAndSubscription(createMessageDto.chatId, CHAT_TYPES.GENERAL)
      const { chatMemory } = this.messagesUtlis.getChatMemoryForLLM(chat);

      const pyodideInstance = await loadPyodide();
      const interpreter = new PythonInterpreterTool({
        instance: pyodideInstance,
        verbose: false,
      });
      interpreter.description = `
        Evaluates python code in a sandbox environment. The environment resets on every execution.
        You must send the whole script every time and print your outputs. Script should be pure python code that can be evaluated.
        The arguments should be in JSON format e.g. "arguments": "{\n  \"input\": \"print(1/45 > 1/44)\"\n}"
        `;

      const tools = [new Calculator({ verbose: false }), new TavilySearchResults({ maxResults: 5 }), interpreter];
      const { systemMessagePromptTemplate, humanMessagePromptTemplate } = this.messagesUtlis.generateGeneralChatPrompt(chat.User.name, chat.User.speciality, createMessageDto);
      const prompt: ChatPromptTemplate<any, any> = this.messagesUtlis.getLLMPrompt(systemMessagePromptTemplate, humanMessagePromptTemplate);

      const { response } = await this.messagesUtlis.getLLMResponse(chatMemory, tools, prompt, humanMessagePromptTemplate, res);
      const chatTitle = await this.messagesUtlis.finalizeChat(subscription, chat, createMessageDto, response);

      return {
        chatId: chat.id,
        chatTitle: chatTitle,
        response: response,
        code: 200
      }

    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async createDiagnosticMessage(createMessageDto: CreateMessageDto, res: Response) {

    try {

      const { chat, subscription } = await this.messagesUtlis.validateUserChatAndSubscription(createMessageDto.chatId, CHAT_TYPES.GENERAL)
      const { chatMemory } = this.messagesUtlis.getChatMemoryForLLM(chat);

      const tools = [new Calculator({ verbose: false })];
      const { systemMessagePromptTemplate, humanMessagePromptTemplate } = this.messagesUtlis.generateDiagnosticChatprompt(chat.User.name, chat.User.speciality, createMessageDto);
      const prompt: ChatPromptTemplate<any, any> = this.messagesUtlis.getLLMPrompt(systemMessagePromptTemplate, humanMessagePromptTemplate);

      const { response } = await this.messagesUtlis.getLLMResponse(chatMemory, tools, prompt, humanMessagePromptTemplate, res);
      const { chatTitle } = await this.messagesUtlis.finalizeChat(subscription, chat, createMessageDto, response);

      return {
        chatId: chat.id,
        chatTitle: chatTitle,
        response: response,
        code: 200
      }

    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async createEvidenceMessage(createMessageDto: CreateMessageDto, res: Response) {

    try {

      const { chat, subscription } = await this.messagesUtlis.validateUserChatAndSubscription(createMessageDto.chatId, CHAT_TYPES.GENERAL)
      const { chatMemory } = this.messagesUtlis.getChatMemoryForLLM(chat);

      const exaTool = new ExaSearchResults({
        client: this.exa,
        verbose: false,
        searchArgs: {
          type: "keyword",
          numResults: 3,
          useAutoprompt: true,
          text: {
            maxCharacters: 30000,
            includeHtmlTags: true
          },
          includeDomains: ["https://cochranelibrary.com", "https://ncbi.nlm.nih.gov"],
        },
      });

      const tools = [exaTool];
      const { systemMessagePromptTemplate, humanMessagePromptTemplate } = this.messagesUtlis.generateEvidenceChatprompt(chat.User.name, chat.User.speciality, createMessageDto);
      const prompt: ChatPromptTemplate<any, any> = this.messagesUtlis.getLLMPrompt(systemMessagePromptTemplate, humanMessagePromptTemplate);

      const { response } = await this.messagesUtlis.getLLMResponse(chatMemory, tools, prompt, humanMessagePromptTemplate, res);
      const { chatTitle } = await this.messagesUtlis.finalizeChat(subscription, chat, createMessageDto, response);

      return {
        chatId: chat.id,
        chatTitle: chatTitle,
        response: response,
        code: 200
      }

    } catch (e) {
      console.log(e);
      throw e;
    }

  }


  async summaryEvaluation(summeryEvaluationDto: SummeryEvaluationDto): Promise<{ completenessRating?: number, recommendedImprovements?: string[] }> {
    const summary = summeryEvaluationDto.summary;

    // Primary prompt for the RAG chain
    const ragPrompt = ChatPromptTemplate.fromMessages(
      [
        [
          "system",
          `You are a medical case reviewer. Your task is to encourage the physician to provide more details about the patient that will help
           later processing steps generate helpful guidance for the physician's query. Follow these steps:
           1) Read the provided patient summary carefully.
           2) Assess the completeness of the summary based on essential patient background—for example, relevant demographics,
            presenting complaint, relevant medical history, significant clinical findings, and any additional context important to
            understanding the patient's condition.
           3) Select one answer from the following set of possible ratings for the summary's completeness:
            1: Very Incomplete
            2: Somewhat Incomplete
            3: Sufficient
            4: Complete
            5: Very Complete
           4) List any recommended improvements or missing elements that would help the physician make the summary more complete, if applicable.
            If no improvements are needed, return an empty list.

          Important Notes:
          Base your evaluation strictly on the information provided in the summary; do not infer or rely on external knowledge.`
        ],
        [
          "human",
          `Case summary (possible with physicians query): {summary}`
        ]
      ]
    );

    const ragLLM = this.openaiService.ragLLM();
    const ragChain = ragPrompt.pipe(ragLLM.withStructuredOutput(summrayEvRagOutputSchema));
    return ragChain.invoke({ summary: summary });
  }

}