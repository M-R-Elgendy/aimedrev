
import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class PasswordResetDto {

    @IsString()
    @IsNotEmpty()
    oldPassword: string;

    @IsString()
    @IsNotEmpty()
    @IsStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
    newPassword: string;

}
