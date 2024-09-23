import { IsString, IsNotEmpty, IsInt, Length, Min, Max } from 'class-validator';

export class CreateCountryDto {
    @IsString()
    @IsNotEmpty()
    @Length(2, 3)
    ISOCode: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsInt()
    @Min(1)
    phoneCode: number;
}
