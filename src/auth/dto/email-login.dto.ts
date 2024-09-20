
import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsEmail, IsStrongPassword } from 'class-validator';

export class EmailLogInDto {

    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => value.toLowerCase())
    email: string;

    @IsString()
    password: string;

}
