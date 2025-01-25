import { Injectable } from '@nestjs/common';
import { CreateMessageDto, SummeryEvaluationDto } from './dto/create-message.dto';
import { CHAT_TYPES } from '@prisma/client';
import { Calculator } from "@langchain/community/tools/calculator";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { PythonInterpreterTool } from "@langchain/community/experimental/tools/pyinterpreter";
import { loadPyodide } from "pyodide";
import { ExaSearchResults } from '@langchain/exa';
import { Response } from 'express';
import { MessagesUtlis } from './utlis/common.utlis';
import { summrayEvRagOutputSchema } from './z-schemas/rag-output.schema';
import { OpenAIService } from 'src/openai/openai.service';
import Exa from 'exa-js';
import { MultiRetriever } from './utlis/multi-retriever.utlis';
import { RagChain } from './utlis/rag-chain.utlis';
@Injectable()
export class MessagesService {

  private readonly exa = new Exa(process.env.EXA_API_KEY);
  constructor(
    private readonly messagesUtlis: MessagesUtlis,
    private readonly openaiService: OpenAIService,
    private readonly multiRetriever: MultiRetriever,
    private readonly ragChain: RagChain
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

      const { chat, subscription } = await this.messagesUtlis.validateUserChatAndSubscription(createMessageDto.chatId, CHAT_TYPES.DIAGNOSTIC)
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

      const { chat, subscription } = await this.messagesUtlis.validateUserChatAndSubscription(createMessageDto.chatId, CHAT_TYPES.EVIDENCE_BASED)
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

  async createEvidenceMessageV2(createMessageDto: CreateMessageDto, res: Response) {

    try {
      const { chat, subscription } = await this.messagesUtlis.validateUserChatAndSubscription(createMessageDto.chatId, CHAT_TYPES.EVIDENCE_BASED)
      const retrievedDocs = await this.multiRetriever.retrieve(createMessageDto.message, 15);

      if (retrievedDocs.length < 1) {
        res.write("I couldn't find any relevant articles that could answer your question in our database.");
        res.end();
      }

      const chain = await this.ragChain.getRagChain();

      const result = await chain.invoke({
        question: createMessageDto.message,
        docs: retrievedDocs,
      });
      const { answer, citations } = result.quoted_answer;
      const verdict = result.validation.verdict;

      if (verdict == 'NO') {
        console.log(answer);
        res.write("I couldn't find any relevant articles that could answer your question.");
        res.end();
      }

      let response: string = answer;
      response += "\n\nSources:\n";
      res.write(response);

      let articles = new Set();
      let num = 0;

      citations.forEach(cit => {
        num++;
        const c = retrievedDocs[cit];

        if ('source' in c.metadata && c.metadata['source'] == 'PMC') {
          const { "title": title, "date": date, "pmc-id": pmcId } = c.metadata;

          const link = this.messagesUtlis.generateLink(pmcId, title + ", " + date[1] + ".")
          if (!articles.has(link)) {
            response += '\n' + num + '. ' + link;
            res.write('\n' + num + '. ' + link);
          }
          articles.add(link);
        } else {
          const { "title": title, "publishedDate": publishedDate, "url": url } = c.metadata;

          // Generate link as RMD
          const link = `[${title}.${publishedDate.slice(0, 4)}](${url})`;

          if (!articles.has(link)) {
            response += '\n' + num + '. ' + link;
            res.write('\n' + num + '. ' + link);
          }
          articles.add(link);
        }

      });

      res.end();

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
    const result = await ragChain.invoke({ summary: summary });

    // Save result and connect it with chat id
    // Also we can return Eval Id with firest req and front end should send it aftter that with any new Eval request
    // Then create an endpoint to match the chatId wih Eval Id if the chat started

    return result;
  }

}