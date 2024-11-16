import { Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { OpenAIService } from 'src/openai/openai.service';
import { OpenAIServiceV2 } from 'src/openai/openai.service-v2';

import { Chat, PrismaClient } from '@prisma/client';
import { AuthContext } from 'src/auth/auth.context';
import { UserService } from 'src/user/user.service';
import { Utlis } from 'src/global/utlis';
import { CHAT_TYPES } from '@prisma/client';
import { MarkdownService } from 'src/markdown/markdown.service';

import { ConversationSummaryBufferMemory, ConversationSummaryBufferMemoryInput } from "langchain/memory";
import { Calculator } from "@langchain/community/tools/calculator";
import { ChatPromptTemplate, MessagesPlaceholder, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";

import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { PythonInterpreterTool } from "@langchain/community/experimental/tools/pyinterpreter";
import { AgentExecutor, createOpenAIToolsAgent, createToolCallingAgent } from "langchain/agents";
import { loadPyodide } from "pyodide";

@Injectable()
export class MessagesService {

  constructor(
    private readonly prisma: PrismaClient,
    private readonly authContext: AuthContext,
    private readonly openaiService: OpenAIService,
    private readonly openaiServiceV2: OpenAIServiceV2,
    private readonly userService: UserService,
    private readonly utlis: Utlis,
    private readonly markdownService: MarkdownService
  ) { }

  async create(createMessageDto: CreateMessageDto) {

    // this.openaiServiceV2.testService();
    // return;

    try {
      const userId = this.authContext.getUser().id;

      const chat = await this.prisma.chat.findUnique({
        where: {
          id: createMessageDto.chatId,
          userId: userId
        },
        select: {
          id: true,
          messages: true,
          title: true,
          type: true,
          User: {
            select: {
              name: true,
              speciality: true
            }
          }
        }
      });
      if (!chat) return { message: 'Chat not found', code: 400 };

      const userSubscriptions = await this.userService.getUserSubscriptions(userId);

      // const hasActiveSubscription = this.utlis.hasActiveSubscription(userSubscriptions);
      // if (!hasActiveSubscription) return { message: 'You have no active subscription', code: 401 };

      const subscription = userSubscriptions[userSubscriptions.length - 1]?.id;

      chat.messages.push({
        role: 'user',
        content: {
          message: createMessageDto.message,
          images: createMessageDto.images,
          pdfs: createMessageDto.pdfs
        }
      });

      let prompt: ChatPromptTemplate<any, any>;
      if (chat.type == CHAT_TYPES.GENERAL) {
        let { prompt, promptText } = this.generateGeneralChatPrompt(chat.User.name, chat.User.speciality, createMessageDto);
      } else if (chat.type == CHAT_TYPES.DIAGNOSTIC) {
        // prompt = this.generateDiagnosticChatprompt(chat.User.name, chat.User.speciality, createMessageDto);
      } else {
        // prompt = this.generateEvidenceChatprompt(chat.User.name, chat.User.speciality, createMessageDto);
      }

      const deserializedHistory = chat.messages.map((message: any) => {
        const role = message.role;
        switch (role) {
          case "SystemMessage":
            return new SystemMessage(message.content.message);
          case "user":
            return new HumanMessage(message.content.message);
          case "PhysAID":
            return new AIMessage(message.content.message);
          default:
            throw new Error("Unknown message type");
        }
      });

      const memoryHistory = new InMemoryChatMessageHistory(deserializedHistory);
      const chatMemory = new ConversationSummaryBufferMemory({
        llm: this.openaiServiceV2.getChatModel(),
        maxTokenLimit: 10000,
        aiPrefix: "PhysAid",
        humanPrefix: "Doctor",
        chatHistory: memoryHistory,
        outputKey: "output",
        memoryKey: "history",
        returnMessages: true,
      });

      const pyodideInstance = await loadPyodide({
        fullStdLib: true,
      });
      const interpreter = new PythonInterpreterTool({
        instance: pyodideInstance,
        verbose: false
      });
      interpreter.description = `Evaluates python code in a sandbox environment. The environment resets on every execution.
         You must send the whole script every time and print your outputs. Script should be pure python code that can be evaluated.
         The arguments should be in JSON format e.g. "arguments": "{\n  \"input\": \"print(1/45 > 1/44)\"\n}"`;

      const tools = [new Calculator({ verbose: false }), new TavilySearchResults({ maxResults: 5 }), interpreter];

      const agent = await createOpenAIToolsAgent({
        llm: this.openaiServiceV2.getChatModel(),
        tools,
        prompt,
      });

      const agentExecutor = AgentExecutor.fromAgentAndTools({
        memory: chatMemory,
        agent: agent,
        tools: tools,
        verbose: false
      });

      const response0 = await agentExecutor.invoke(
        { input: promptText },

      );

      const chatHistory = {
        role: "user",
        content: JSON.stringify(chat.messages)
      };

      const response = await this.openaiService.query(prompt, chatHistory);
      chat.messages.push({
        role: 'PhysAID',
        content: {
          message: response,
          images: [],
          pdfs: []
        }
      });

      // Update subscription query count
      // await this.updateSubscriptionQueryCount(subscription);

      let chatTitle: string;
      if (chat.title.toLowerCase() == "new chat" && chat.messages.length) {
        chatTitle = await this.generateChatTitle(chat);
        chat.title = chatTitle;
      } else {
        chatTitle = chat.title;
      }

      await this.prisma.chat.update({
        where: { id: chat.id },
        data: { messages: chat.messages, title: chatTitle }
      });

      return {
        chatId: chat.id,
        chatTitle: chatTitle,
        response: this.markdownService.convertToHtml(response),
        code: 200
      }

    } catch (e) {
      console.log(e);
      throw new Error('An error occurred while processing the message.');
    }
  }

  private async updateSubscriptionQueryCount(subscriptionId: string) {
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { usedQuries: { increment: 1 } }
    });
  }

  private async generateChatTitle(chat: Chat & any) {

    const promptText = `
            You will be provided with a chat where PhysAid answers the queries of a doctor.
            Your task is to generate a title this chat that represents the subject at which PhysAid helps the docor.
            To do the task successfully:
            1) your output is the title only in plain text.
            2) do not exceed 40 characters.
            3) use acronyms and abbreviations.
            4) the title should not mention the speakers.
            5) do not mention the type of chat e.g. assistance, query, help, etc.
    `;

    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(promptText),
      new MessagesPlaceholder("history"),
      HumanMessagePromptTemplate.fromTemplate([{ text: promptText }]),
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const chatHistory = {
      role: "user",
      content: JSON.stringify(chat.messages)
    };

    return await this.openaiService.query(prompt, chatHistory);

  }

  private generateGeneralChatPrompt(doctorName: string, doctorSpecialty: string, message: CreateMessageDto): { prompt: ChatPromptTemplate<any, any>, promptText: string } {
    const { message: userMessage, images, pdfs } = message;

    let query = userMessage;
    let humanTemplate: any[];

    if (images?.length) {
      query += `\nPlease review these images:\n${images.join("\n")}`;

      images.forEach((image) => {
        humanTemplate.push({ image_url: image });
      });
    }

    if (pdfs?.length) {
      query += `\nPlease review these PDF files:\n${pdfs.join("\n")}`;

      pdfs.forEach((pdf) => {
        humanTemplate.push({ pdf_url: pdf });
      });
    }

    const promptText = `
        You are PhysAid, an assistant for Dr. ${doctorName}, a professional healthcare provider specialized in ${doctorSpecialty}.
        Your task is to answer clinical questions with the utmost accuracy, detail, and professionalism.
    
        ${doctorName} Query: "${query}"
    
        General Rules to Follow:
            - Maintain Professionalism: Your tone should be professional, clear, and respectful.
            - Remain Specialty-Agnostic: While you are assisting a specialist, your responses should cover any specialty when required.
            - Adhere to Guidelines: Ensure your answer follows the scientific consensus and the most recent guidelines, and is supported by references.
            - Provide a Detailed Answer: Your response should be comprehensive, addressing all relevant aspects of the medical question.

        Clinical Case Response Guidelines:
            
            - Step-by-Step Analysis: Begin by analyzing the case scenario step-by-step. Consider the patient's primary condition and any additional factors such as comorbidities (e.g., diabetes).
            
            - Rationale for Recommendations: Always provide the rationale behind your recommendations to ensure the user understands the clinical reasoning.
            
            - Exact Dosages and Details: When recommending medications, provide dosage ranges rather than a single value whenever appropriate, including loading doses, maintenance doses, frequency, and duration.
              Specify adjustments for special considerations, such as renal or hepatic impairment. 
              DO NOT generalize with terms like "loading dose" without specifying exact numbers.

            - Details on Side Effects: Mention common side effects and potential interactions for any recommended interventions.

            - Rank Interventions by Significance: Recommend the most effective intervention first, followed by alternative options 
              to account for the user's access to resources and familiarity with specific interventions.

            - Provide Detailed Guidance on Interventions: For each recommended intervention, include specific steps and diagnostic methods,
              such as bacterial culture, rapid diagnostics, or Gram staining, to ensure comprehensive and actionable guidance.

            - Management Order and Priority: Rank treatment steps by clinical importance, with the most critical interventions listed first
              to emphasize a prioritized approach.

            - Point Out Missed Aspects: Direct the user to relevant points they may have missed in their case analysis and offer alternative perspectives.

            - Consider Differential Diagnosis: Always include a consideration of differential diagnoses and explain why some diagnoses may be ruled out.

            - Do Not Jump to Conclusions: Work through each step methodically, avoiding premature conclusions.

            - Shared Decision-Making: Highlight where patient preferences may play a role and encourage shared decision-making in treatment options.

            - Cross-Specialty Consultation: Suggest consultations with relevant specialists (e.g., infectious diseases, clinical pharmacists) 
              when appropriate to ensure a comprehensive treatment approach.

          Summary:
            - Summary of Recommendations: At the end, provide a summary of the recommendations, ordered by clinical importance.

          This approach ensures that all responses are comprehensive, well-supported, and aligned with best clinical practices.
    `;

    humanTemplate.push({ text: query });

    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(promptText),
      new MessagesPlaceholder("history"),
      HumanMessagePromptTemplate.fromTemplate([{ text: query }]),
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    return { prompt, promptText };
  }

  private generateDiagnosticChatprompt(doctorName: string, doctorSpecialty: string, message: CreateMessageDto): string {

    const { message: userMessage, images, pdfs } = message;

    let query = userMessage;

    if (images?.length) {
      query += `\nPlease review these images:\n${images.join("\n")}`;
    }

    if (pdfs?.length) {
      query += `\nPlease review these PDF files:\n${pdfs.join("\n")}`;
    }

    return `You are PhysAid, a professional medical assistant for Dr. ${doctorName}, a professional healthcare provider specializing in ${doctorSpecialty}.
            Your task is to assist the doctor in reaching the correct diagnosis based on the case scenario provided.
        
            ${doctorName} Query: "${query}"
        
            General Rules to Follow:

            Maintain Professionalism: Your tone should be professional, clear, and respectful.
            Remain Specialty-Agnostic: While you are assisting a specialist, your responses should cover any specialty when required.
            Provide Multiple Choice Options: When gathering information, offer multiple-choice options when possible to facilitate efficient information collection.
            Gather Missing Information: Recognize when important information is missing from the case scenario and proactively ask for it using multiple-choice questions when appropriate.
            Provide Multiple-Choice Options: When gathering information, offer multiple-choice options when possible to facilitate efficient information collection.

            Steps To Follow:

            Step 1: Identify any missing or unclear information necessary for diagnosis. Ask clarifying questions to gather this information. 
            When possible, present your questions with multiple-choice options to guide the information-gathering process.
            Step 2: Analyze the information provided to narrow down possible diagnoses.
            Step 3: Recommend the next steps to further refine the differential diagnosis.
            Step 4: Incorporate new information to refine your analysis.
            Step 5: When sufficient information is available, suggest one final diagnosis.
    `;

  }

  private generateEvidenceChatprompt(doctorName: string, doctorSpecialty: string, message: CreateMessageDto): string {

    const { message: userMessage, images, pdfs } = message;

    let query = userMessage;

    if (images?.length) {
      query += `\nPlease review these images:\n${images.join("\n")}`;
    }

    if (pdfs?.length) {
      query += `\nPlease review these PDF files:\n${pdfs.join("\n")}`;
    }

    return `
          You are PhysAid, an assistant for Dr. ${doctorName}, a professional healthcare provider specializing in ${doctorSpecialty}.
          Your task is to answer clinical questions with the utmost accuracy and detail.
        
          ${doctorName} Query: "${query}"
        
          General Rules to Follow:
          - Maintain Professionalism: Your tone should be professional, clear, and respectful.
          - Remain Specialty-Agnostic: While you are assisting a specialist, your responses should cover any specialty when required.
          - Provide a Detailed Answer: Craft a comprehensive and detailed response, ensuring that all relevant aspects of the medical question are addressed. Include multiple perspectives if applicable.
          
          Steps to Follow:
          Step 1: Initiate a Search: Always begin by using the search tool to find relevant, up-to-date information related to the medical question. The current year is 2024.
          Step 2: Extract Information: Use only the content from the webpages returned by the search tool to formulate your answer. Do not rely on any internal knowledge or memory.
          Step 3: Cite Sources: Always include the URLs of the sources returned by the search tool in your answer, providing proper citation for each piece of information used.
    `;

  }


}
