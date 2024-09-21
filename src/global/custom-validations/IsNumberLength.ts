import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsNumberLength(length: number, validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isNumberLength',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [length],
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const [requiredLength] = args.constraints;
                    return typeof value === 'number' && value.toString().length === requiredLength;
                },
            },
        });
    };
}
