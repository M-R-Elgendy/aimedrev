import { IsArray, IsBoolean, IsEnum, IsNumber, IsString, Length } from "class-validator";

export enum FREQUENCY {
    monthly = 'monthly',
    quarterly = 'quarterly',
    biannually = 'biannually',
    yearly = 'yearly',
    unlimited = 'unlimited'
}

export class CreatePlanDto {
    @IsString()
    @Length(5, 20)
    title: string

    @IsString()
    @Length(5, 255)
    description: string

    @IsNumber()
    globalPrice: number

    @IsNumber()
    egPrice: number

    @IsEnum(FREQUENCY)
    frequency: FREQUENCY

    @IsNumber()
    qeriesCount: number

    @IsBoolean()
    isActive: boolean

    @IsArray()
    @IsString({ each: true })
    features: string[]
}
