import { All } from '@nestjs/common';
import { IsString, IsNotEmpty, IsEmail, MinLength, MaxLength, IsOptional, Allow } from 'class-validator';

export enum USER_TYPES {
    USER = 'user',
    ADMIN = 'admin',
}

export class CreateUserDto {

    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(50)
    name: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsOptional()
    @IsString()
    @Allow(undefined)
    @Allow(null)
    password: string | null;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    phone: string | null;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    country: string | null;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    speciality: string | null;
}
