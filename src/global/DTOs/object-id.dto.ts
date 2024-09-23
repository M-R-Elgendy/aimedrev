import { IsMongoId } from "class-validator";

export class ObjectIdDto {
    @IsMongoId({ message: "Invalid Id" })
    id: string;
}