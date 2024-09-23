import { IsString, IsNotEmpty, IsObject, IsMongoId } from 'class-validator';

export class CreateTransactionDto {
    @IsString()
    @IsNotEmpty()
    paymentMethod: string;

    @IsObject()
    @IsNotEmpty()
    stripe: object;

    @IsString()
    @IsNotEmpty()
    tran_ref: string;

    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    userId: string;

    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    planId: string;
}
