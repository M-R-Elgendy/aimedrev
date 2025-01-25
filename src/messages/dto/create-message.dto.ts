import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

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

    @IsMongoId()
    @IsNotEmpty()
    @IsOptional()
    evaluationId?: string;

    @IsMongoId()
    @IsNotEmpty()
    @IsOptional()
    chatId?: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(30)
    summary: string;
}