import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateMessageDto {
    @IsNotEmpty()
    @IsString()
    @IsMongoId()
    chatId: string;

    @IsNotEmpty()
    @IsString()
    message: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    pdfs?: string[];
}

export class SummeryEvaluationDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(50)
    summary: string;
}