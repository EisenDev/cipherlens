import { Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto } from './auth.validation';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signup(dto: SignupDto): Promise<{
        success: boolean;
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        success: boolean;
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            fullName: string;
            email: string;
        };
    }>;
    me(req: Request & {
        user: any;
    }): Promise<any>;
    logout(refreshToken: string): Promise<{
        success: boolean;
    }>;
    refresh(refreshToken: string): Promise<{
        success: boolean;
        accessToken: string;
        refreshToken: string;
    }>;
}
