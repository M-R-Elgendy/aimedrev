import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { CHAT_TYPES } from '@prisma/client';

export class CreateChatDto {
    @IsString()
    @IsNotEmpty()
    @IsEnum(CHAT_TYPES)
    type: CHAT_TYPES;
}
