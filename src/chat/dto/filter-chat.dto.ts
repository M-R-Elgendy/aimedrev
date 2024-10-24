import { IsString, IsEnum, Allow, IsOptional } from 'class-validator';
import { CHAT_TYPES } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateChatDto {
    @IsString()
    @IsOptional()
    @IsEnum(CHAT_TYPES)
    type: CHAT_TYPES;
}
