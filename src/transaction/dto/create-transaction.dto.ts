import { IsString, IsNotEmpty, IsObject, IsMongoId, IsInt, IsPositive } from 'class-validator';

export class CreateTransactionDto {
    @IsString()
    @IsNotEmpty()
    paymentMethod: string;

    @IsObject()
    @IsNotEmpty()
    stripeSession: object;

    @IsString()
    @IsNotEmpty()
    tran_ref: string;

    @IsInt()
    @IsPositive()
    amount: number;


    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    currency: string;

    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    userId: string;

    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    planId: string;
}
