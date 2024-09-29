
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsEmail } from 'class-validator';

export class ResetPasswordRequestDto {

    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => value.toLowerCase())
    email: string;

}
