import { IsNotEmpty, IsOptional, IsString, MaxLength, IsUrl } from 'class-validator';

export class CreateReviewDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    reviewerName: string;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    reviewerPosition: string;

    @IsString()
    @IsOptional()
    @IsUrl()
    @MaxLength(255)
    reviewerImage: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    content: string;
}
