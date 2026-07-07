import { PrismaService } from '../prisma.service';
import { SignupDto, LoginDto } from './auth.validation';
export declare class AuthService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private hashToken;
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
    logout(refreshToken: string): Promise<{
        success: boolean;
    }>;
    refresh(refreshToken: string): Promise<{
        success: boolean;
        accessToken: string;
        refreshToken: string;
    }>;
}
