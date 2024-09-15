import { IsString, IsNotEmpty, IsEmail, MinLength, MaxLength, IsOptional, Allow, IsJWT } from 'class-validator';

export enum USER_TYPES {
    USER = 'user',
    ADMIN = 'admin',
}

export class GoogleAuthDto {

    @IsString()
    @IsNotEmpty()
    @IsJWT()
    accessToken: string;
}
