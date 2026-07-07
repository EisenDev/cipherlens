"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZodValidationPipe = exports.LoginDto = exports.loginSchema = exports.SignupDto = exports.signupSchema = void 0;
const zod_1 = require("zod");
exports.signupSchema = zod_1.z
    .object({
    fullName: zod_1.z
        .string()
        .min(1, 'Full name is required.'),
    email: zod_1.z
        .string()
        .min(1, 'Email is required.')
        .email('Invalid email format.'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters long.'),
    confirmPassword: zod_1.z
        .string()
        .min(1, 'Confirm password is required.'),
    companyName: zod_1.z
        .string()
        .optional()
        .nullable()
        .or(zod_1.z.literal('')),
    teamSize: zod_1.z
        .string()
        .optional()
        .nullable()
        .or(zod_1.z.literal('')),
    role: zod_1.z
        .string()
        .optional()
        .nullable()
        .or(zod_1.z.literal('')),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match.',
    path: ['confirmPassword'],
});
class SignupDto {
    fullName;
    email;
    password;
    confirmPassword;
    companyName;
    teamSize;
    role;
}
exports.SignupDto = SignupDto;
exports.loginSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .min(1, 'Email is required.')
        .email('Invalid email format.'),
    password: zod_1.z
        .string()
        .min(1, 'Password is required.'),
});
class LoginDto {
    email;
    password;
}
exports.LoginDto = LoginDto;
const common_1 = require("@nestjs/common");
const zod_2 = require("zod");
let ZodValidationPipe = class ZodValidationPipe {
    schema;
    constructor(schema) {
        this.schema = schema;
    }
    transform(value, metadata) {
        try {
            const parsedValue = this.schema.parse(value);
            return parsedValue;
        }
        catch (error) {
            if (error instanceof zod_2.ZodError) {
                const errorList = error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new common_1.BadRequestException({
                    success: false,
                    errors: errorList,
                });
            }
            throw new common_1.BadRequestException('Validation failed');
        }
    }
};
exports.ZodValidationPipe = ZodValidationPipe;
exports.ZodValidationPipe = ZodValidationPipe = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], ZodValidationPipe);
//# sourceMappingURL=auth.validation.js.map