import { Transform } from 'class-transformer';
import { IsString, IsNumber, IsStrongPassword, IsEmail, IsNotEmpty } from 'class-validator';
import { IsNumberLength } from 'src/global/custom-validations/IsNumberLength';

export class OTPPasswordResetDto {

    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => value.toLowerCase())
    email: string;

    @IsNumber()
    @IsNumberLength(6, { message: 'OTP must be 6 digits' })
    otp: string;

    @IsString()
    @IsStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
    password: string;

}
