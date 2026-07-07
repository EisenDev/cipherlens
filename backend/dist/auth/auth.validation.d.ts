import { z } from 'zod';
export declare const signupSchema: z.ZodObject<{
    fullName: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
    companyName: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    teamSize: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    role: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare class SignupDto {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    companyName?: string | null;
    teamSize?: string | null;
    role?: string | null;
}
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare class LoginDto {
    email: string;
    password: string;
}
import { PipeTransform, ArgumentMetadata } from '@nestjs/common';
export declare class ZodValidationPipe implements PipeTransform {
    private schema;
    constructor(schema: any);
    transform(value: unknown, metadata: ArgumentMetadata): any;
}
