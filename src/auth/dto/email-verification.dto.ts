import { Transform } from 'class-transformer';
import { IsNotEmpty, IsEmail, IsNumber, Length } from 'class-validator';
import { IsNumberLength } from 'src/global/custom-validations/IsNumberLength';

export class EmailVerificationDto {

    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => value.toLowerCase())
    email: string;

    @IsNumber()
    @IsNumberLength(+process.env.VERIFICATION_CODE_LENGTH || 6, { message: `OTP must be a ${+process.env.VERIFICATION_CODE_LENGTH || 6}-digit number` })
    code: number;
}

export class SendOTPDto {

    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => value.toLowerCase())
    email: string;

}
