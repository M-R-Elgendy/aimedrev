import { IsMongoId } from "class-validator";

export class ObjectIdDto {
    @IsMongoId({ message: "Invalid plan Id" })
    id: string;
}