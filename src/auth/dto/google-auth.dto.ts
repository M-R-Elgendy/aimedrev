import { IsString, IsNotEmpty } from 'class-validator';
export class GoogleAuthDto {

    @IsString()
    @IsNotEmpty()
    // @IsJWT()
    accessToken: string;
}
