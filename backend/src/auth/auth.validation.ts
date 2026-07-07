import { z } from 'zod';

/**
 * Validation schema for User Signup.
 */
export const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'Full name is required.'),
    email: z
      .string()
      .min(1, 'Email is required.')
      .email('Invalid email format.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.'),
    confirmPassword: z
      .string()
      .min(1, 'Confirm password is required.'),
    companyName: z
      .string()
      .optional()
      .nullable()
      .or(z.literal('')),
    teamSize: z
      .string()
      .optional()
      .nullable()
      .or(z.literal('')),
    role: z
      .string()
      .optional()
      .nullable()
      .or(z.literal('')),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match.',
    path: ['confirmPassword'],
  });

/**
 * DTO class for Signup.
 */
export class SignupDto {
  fullName!: string;
  email!: string;
  password!: string;
  confirmPassword!: string;
  companyName?: string | null;
  teamSize?: string | null;
  role?: string | null;
}

/**
 * Validation schema for User Login.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Invalid email format.'),
  password: z
    .string()
    .min(1, 'Password is required.'),
});

/**
 * DTO class for Login.
 */
export class LoginDto {
  email!: string;
  password!: string;
}

import { PipeTransform, ArgumentMetadata, BadRequestException, Injectable } from '@nestjs/common';
import { ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  private schema: any;

  constructor(schema: any) {
    this.schema = schema;
  }

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorList = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        throw new BadRequestException({
          success: false,
          errors: errorList,
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
