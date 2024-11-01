import { Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { OpenAIService } from 'src/openai/openai.service';
import { Chat, PrismaClient } from '@prisma/client';
import { AuthContext } from 'src/auth/auth.context';
import { UserService } from 'src/user/user.service';
import { Utlis } from 'src/global/utlis';
@Injectable()
export class MessagesService {

  constructor(
    private readonly prisma: PrismaClient,
    private readonly authContext: AuthContext,
    private readonly openaiService: OpenAIService,
    private readonly userService: UserService,
    private readonly utlis: Utlis
  ) { }

  async create(createMessageDto: CreateMessageDto) {
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

      const hasActiveSubscription = this.utlis.hasActiveSubscription(userSubscriptions);
      if (!hasActiveSubscription) return { message: 'You have no active subscription', code: 401 };

      const subscription = userSubscriptions[userSubscriptions.length - 1]?.id;

      chat.messages.push({
        role: 'user',
        content: {
          message: createMessageDto.message,
          images: createMessageDto.images,
          pdfs: createMessageDto.pdfs
        }
      });

      let chatTitle: string;
      if (chat.title.toLowerCase() == "new chat") {
        chatTitle = await this.generateChatTitle(chat);
        chat.title = chatTitle;
      } else {
        chatTitle = chat.title;
      }

      // Get response from openai
      const prompot = this.generateGeneralChatPrompt(chat.User.name, chat.User.speciality, createMessageDto);

      const chatHistory = {
        role: "user",
        content: JSON.stringify(chat.messages)
      };
      const response = await this.openaiService.query(prompot, chatHistory);
      chat.messages.push({
        role: 'PhysAID',
        content: {
          message: response,
          images: [],
          pdfs: []
        }
      });


      // Update subscription query count
      await this.updateSubscriptionQueryCount(subscription);

      return await this.prisma.chat.update({
        where: { id: chat.id },
        data: { messages: chat.messages, title: chatTitle }
      });

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

    const prompot = `
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

    return await this.openaiService.query(prompot, chatHistory);

  }

  private generateGeneralChatPrompt(doctorName: string, doctorSpecialty: string, message: CreateMessageDto): string {
    const { message: userMessage, images, pdfs } = message;

    let query = userMessage;

    if (images?.length) {
      query += `\nPlease review these images:\n${images.join("\n")}`;
    }

    if (pdfs?.length) {
      query += `\nPlease review these PDF files:\n${pdfs.join("\n")}`;
    }

    return `
    You are PhysAid, an assistant for Dr. ${doctorName}, a professional healthcare provider specialized in ${doctorSpecialty}.
    Your task is to answer clinical questions with the utmost accuracy, detail, and professionalism.
    
    User's Query: "${query}"
    
    General Guidelines:
      - Maintain Professionalism: Use a tone that is professional, clear, and respectful.
      - Remain Specialty-Agnostic: Although assisting a specialist, cover any specialty as needed.
      - Follow Guidelines: Ensure responses are aligned with scientific consensus and the latest guidelines, supported by references.
      - Provide Detailed Answers: Your response should comprehensively address all relevant aspects of the medical question.
    
    Clinical Case Response Guidelines:
      - Step-by-Step Analysis: Analyze the case scenario in a step-by-step manner. Address the patient's primary condition and any comorbidities (e.g., diabetes).
      - Rationalize Recommendations: Provide clear reasons behind your recommendations to aid understanding.
      - Specify Intervention Plans: When recommending interventions, include details like dosage, duration, and considerations for renal or hepatic function, and note common side effects.
      - Rank Interventions: Prioritize interventions by clinical relevance, availability, and familiarity.
      - Promote Shared Decision-Making: Encourage considering patient preferences in treatment options.
      - Address Missed Aspects: Highlight any relevant points the user might have missed in the case analysis.
      - Consider Differential Diagnosis: Always include differential diagnoses and clarify why certain diagnoses may be ruled out.
      - Avoid Premature Conclusions: Approach each step methodically to prevent early conclusions.
    
    Summary and References:
      - Summarize Recommendations: End with a summary of key recommendations, ranked by clinical importance.
      - Cite References: Support conclusions with references from guidelines, studies, or other authoritative sources.
    
    This approach ensures responses are comprehensive, well-supported, and in alignment with best clinical practices.
    `;
  }


}
