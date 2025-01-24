import { BadRequestException, Injectable } from "@nestjs/common";
import { Chat, CHAT_TYPES, PrismaClient } from '@prisma/client';
import { AuthContext } from 'src/auth/auth.context';
import { UserService } from 'src/user/user.service';
import { Utlis } from 'src/global/utlis';
import { OpenAIService } from 'src/openai/openai.service';
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { ConversationSummaryBufferMemory } from "langchain/memory";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { CreateMessageDto } from "../dto/create-message.dto";
import { ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { Response } from 'express';

@Injectable()
export class MessagesUtlis {

    constructor(
        private readonly prisma: PrismaClient,
        private readonly authContext: AuthContext,
        private readonly utlis: Utlis,
        private readonly userService: UserService,
        private readonly openaiService: OpenAIService,

    ) { }

    async updateSubscriptionQueryCount(subscriptionId: string) {
        await this.prisma.subscription.update({
            where: { id: subscriptionId },
            data: { usedQuries: { increment: 1 } }
        });
    }

    async validateUserChatAndSubscription(chatId: string, chatType: CHAT_TYPES) {

        const userId = this.authContext.getUser().id;
        const chat = await this.prisma.chat.findUnique({
            where: {
                id: chatId,
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

        if (!chat) throw new BadRequestException('Chat not found');

        const userSubscriptions = await this.userService.getUserSubscriptions(userId);
        const hasActiveSubscription = this.utlis.hasActiveSubscription(userSubscriptions);

        if (!hasActiveSubscription) throw new BadRequestException('You have no active subscription');

        const subscription = userSubscriptions[userSubscriptions.length - 1]?.id;

        if (chatType != chat.type) {
            throw new BadRequestException(`This chat is not a ${chatType} chat`);
        }

        return { chat, subscription };
    }

    async generateChatTitle(chat: Chat & any) {

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

        const chatHistory = {
            role: "user",
            content: JSON.stringify(chat.messages)
        };

        return await this.openaiService.query(promptText, chatHistory);

    }

    getChatMemoryForLLM(chat: any) {

        const deserializedHistory = chat.messages.map((message: any) => {
            const role = message.role;
            switch (role) {
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
            llm: this.openaiService.getChatModel(),
            maxTokenLimit: 10000,
            aiPrefix: "PhysAid",
            humanPrefix: "Doctor",
            chatHistory: memoryHistory,
            outputKey: "output",
            memoryKey: "history",
            returnMessages: true,
        });

        return { chatMemory }

    }

    async finalizeChat(
        subscription: string,
        chat: any,
        createMessageDto: CreateMessageDto,
        aiRespnose: string
    ): Promise<{ chatTitle: string }> {

        chat.messages.push(
            {
                role: 'user',
                content: {
                    message: createMessageDto.message,
                    images: createMessageDto.images,
                    pdfs: createMessageDto.pdfs
                }
            },
            {
                role: 'PhysAID',
                content: {
                    message: aiRespnose,
                    images: [],
                    pdfs: []
                }
            }
        );

        this.updateSubscriptionQueryCount(subscription);

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

        return { chatTitle }
    }

    getLLMPrompt(systemMessagePromptTemplate: string, humanMessagePromptTemplate: any[]) {
        return ChatPromptTemplate.fromMessages([
            SystemMessagePromptTemplate.fromTemplate(systemMessagePromptTemplate),
            new MessagesPlaceholder("history"),
            HumanMessagePromptTemplate.fromTemplate(humanMessagePromptTemplate),
            new MessagesPlaceholder("agent_scratchpad"),
        ]);
    }

    async getLLMResponse(
        chatMemory: ConversationSummaryBufferMemory,
        tools: any[],
        prompt: ChatPromptTemplate<any, any>,
        humanMessagePromptTemplate: string[],
        res: Response
    ): Promise<{ response: string }> {
        const agent = await createOpenAIToolsAgent({
            llm: this.openaiService.getChatModel(),
            tools,
            prompt,
        });

        const agentExecutor = AgentExecutor.fromAgentAndTools({
            memory: chatMemory,
            agent: agent,
            tools: tools
        });

        let response = "";
        await agentExecutor.invoke(
            { input: humanMessagePromptTemplate },
            {
                callbacks: [{
                    handleLLMNewToken(token: string) {
                        response += token;
                        res.write(token);
                    }
                }]
            }
        );
        res.end();

        return { response }
    }

    generateGeneralChatPrompt(doctorName: string, doctorSpecialty: string, message: CreateMessageDto): { systemMessagePromptTemplate: string, humanMessagePromptTemplate: string[] } {
        const { message: userMessage, images, pdfs } = message;

        let query = userMessage;
        let humanMessagePromptTemplate: any[] = [];

        if (images?.length) {
            query += `\nPlease review these images:\n${images.join("\n")}`;

            images.forEach((image) => {
                humanMessagePromptTemplate.push({ image_url: image });
            });
        }

        if (pdfs?.length) {
            query += `\nPlease review these PDF files:\n${pdfs.join("\n")}`;

            pdfs.forEach((pdf) => {
                humanMessagePromptTemplate.push({ pdf_url: pdf });
            });
        }

        const systemMessagePromptTemplate = `
              You are PhysAid, an assistant for Dr. ${doctorName}, a professional healthcare provider specialized in ${doctorSpecialty}.
              Align the response with the authority, responsibilities, and typical workflow for ${doctorSpecialty}, and advise when referral or consultation with senior staff or other specialties is appropriate
              General Rules to Follow:
                - Maintain Professionalism: Your tone should be professional, clear, and respectful.
                - Remain Specialty-Agnostic: While you are assisting a specialist, your responses should cover any specialty when required.
                - Adhere to Guidelines: Ensure your answer follows the scientific consensus and the most recent guidelines, and is supported by references.
                - Provide a Detailed Answer: Your response should be comprehensive, addressing all relevant aspects of the medical question.
        `;

        humanMessagePromptTemplate.push({ text: query });

        return { systemMessagePromptTemplate, humanMessagePromptTemplate };
    }

    generateDiagnosticChatprompt(doctorName: string, doctorSpecialty: string, message: CreateMessageDto): { systemMessagePromptTemplate: string, humanMessagePromptTemplate: string[] } {

        const { message: userMessage, images, pdfs } = message;

        let query = userMessage;
        let humanMessagePromptTemplate: any[] = [];

        if (images?.length) {
            query += `\nPlease review these images:\n${images.join("\n")}`;

            images.forEach((image) => {
                humanMessagePromptTemplate.push({ image_url: image });
            });
        }

        if (pdfs?.length) {
            query += `\nPlease review these PDF files:\n${pdfs.join("\n")}`;

            pdfs.forEach((pdf) => {
                humanMessagePromptTemplate.push({ pdf_url: pdf });
            });
        }

        const systemMessagePromptTemplate = `
              You are PhysAid, an assistant for Dr. ${doctorName}, a professional healthcare provider specialized in ${doctorSpecialty}.
              Your task is to answer clinical questions with the utmost accuracy, detail, and professionalism.
              Align the response with the authority, responsibilities, and typical workflow for ${doctorSpecialty}’s level of GP expertise, and advise when referral or consultation with senior staff or other specialties is appropriate
              General Rules to Follow:
                - Maintain Professionalism: Your tone should be professional, clear, and respectful.
                - Remain Specialty-Agnostic: While you are assisting a specialist, your responses should cover any specialty when required.
                - Adhere to Guidelines: Ensure your answer follows the scientific consensus and the most recent guidelines, and is supported by references.
                - Provide a Detailed Answer: Your response should be comprehensive, addressing all relevant aspects of the medical question.
    
              Clinical Case Response Guidelines:
                
                - Step-by-Step Analysis: Begin by analyzing the case scenario step-by-step. Consider the patient's primary condition and any additional factors such as comorbidities (e.g., diabetes).
                
                - Apply clinical scoring whenever relevant. If any scoring criteria are missing, request them individually.
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

        humanMessagePromptTemplate.push({ text: query });
        return { systemMessagePromptTemplate, humanMessagePromptTemplate };
    }

    generateEvidenceChatprompt(doctorName: string, doctorSpecialty: string, message: CreateMessageDto): { systemMessagePromptTemplate: string, humanMessagePromptTemplate: string[] } {

        const { message: userMessage, images, pdfs } = message;

        let query = userMessage;
        let humanMessagePromptTemplate: any[] = [];

        if (images?.length) {
            query += `\nPlease review these images:\n${images.join("\n")}`;

            images.forEach((image) => {
                humanMessagePromptTemplate.push({ image_url: image });
            });
        }

        if (pdfs?.length) {
            query += `\nPlease review these PDF files:\n${pdfs.join("\n")}`;

            pdfs.forEach((pdf) => {
                humanMessagePromptTemplate.push({ pdf_url: pdf });
            });
        }

        const systemMessagePromptTemplate = `
            You are PhysAid, an assistant for Dr. ${doctorName}, a professional healthcare provider specializing in ${doctorSpecialty}.
            Your task is to answer clinical questions with the utmost accuracy and detail.
            
            General Rules to Follow:
            - Maintain Professionalism: Your tone should be professional, clear, and respectful.
            - Remain Specialty-Agnostic: While you are assisting a specialist, your responses should cover any specialty when required.
            - Provide a Detailed Answer: Craft a comprehensive and detailed response, ensuring that all relevant aspects of the medical question are addressed. Include multiple perspectives if applicable.
            
            Steps to Follow:
            Step 1: Initiate a Search: Always begin by using the search tool to find relevant, up-to-date information related to the medical question. The current year is 2024.
            Step 2: Extract Information: Use only the content from the webpages returned by the search tool to formulate your answer. Do not rely on any internal knowledge or memory.
            Step 3: Cite Sources: Always include the URLs of the sources returned by the search tool in your answer, providing proper citation for each piece of information used.
          `;

        humanMessagePromptTemplate.push({ text: query });
        return { systemMessagePromptTemplate, humanMessagePromptTemplate }

    }

    generateLink(pmcId: number, text: string) {
        return `<a href="https://pmc.ncbi.nlm.nih.gov/articles/${pmcId}">${text}</a>`;
    }
}