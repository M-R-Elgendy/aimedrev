import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { AuthContext } from 'src/auth/auth.context';
import { PrismaClient } from '@prisma/client';
import { OpenAIService } from 'src/openai/openai.service';
import { UserService } from 'src/user/user.service';
import { Utlis } from 'src/global/utlis';
import { StripeService } from 'src/stripe/stripe.service';
import { AxiosService } from 'src/axios/axios.service';
import { MessagesUtlis } from './utlis/common.utlis';
import { MultiRetriever } from './utlis/multi-retriever.utlis';
import { RagChain } from './utlis/rag-chain.utlis';
import { ExaUtlis } from './utlis/exa.utlis';
import { PineconeUtlis } from './utlis/pinecone.utlis';
import { ConfigService } from '@nestjs/config';
import { CustomEmbeddings } from './utlis/custom-embeddings.utlis';
import { Pinecone } from '@pinecone-database/pinecone';

@Module({
  controllers: [MessagesController],
  providers: [
    MessagesService,
    AuthContext,
    PrismaClient,
    OpenAIService,
    UserService,
    Utlis,
    StripeService,
    AxiosService,
    MessagesUtlis,
    MultiRetriever,
    RagChain,
    ExaUtlis,
    PineconeUtlis,
    ConfigService,
    CustomEmbeddings,
    Pinecone
  ],
})
export class MessagesModule { }
