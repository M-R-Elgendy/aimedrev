import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsEmail, MinLength, MaxLength, IsOptional } from 'class-validator';

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
    @Transform(({ value }) => value.toLowerCase())
    email: string;

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
