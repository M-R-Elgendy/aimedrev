import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsEmail, MinLength, MaxLength, IsStrongPassword } from 'class-validator';

export enum USER_TYPES {
    USER = 'user',
    ADMIN = 'admin',
}

export class EmailSignUpDto {

    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(50)
    name: string;

    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => value.toLowerCase())
    email: string;

    @IsString()
    @IsStrongPassword({ minLength: 8, minNumbers: 1 })
    password: string;
}
