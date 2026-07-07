"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../prisma.service");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
let AuthService = class AuthService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    async signup(dto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (existingUser) {
            throw new common_1.ConflictException({
                success: false,
                message: 'An account with this email already exists.',
            });
        }
        const passwordHash = await (0, password_1.hashPassword)(dto.password);
        const user = await this.prisma.user.create({
            data: {
                fullName: dto.fullName,
                email: dto.email.toLowerCase(),
                passwordHash,
                companyName: dto.companyName || null,
                teamSize: dto.teamSize || null,
                role: dto.role || null,
            },
        });
        const project = await this.prisma.project.create({
            data: {
                name: 'Workspace (Default)',
                description: 'Auto-generated default team security intelligence scope.',
                userId: user.id,
            },
        });
        const targetList = [
            { name: 'example.com', url: 'https://example.com', type: 'WEBSITE' },
            { name: 'api.acme.com', url: 'https://api.acme.com', type: 'WEBSITE' },
            { name: 'github.com/acme/app', url: 'https://github.com/acme/app', type: 'REPOSITORY' },
            { name: 'shop.acme.com', url: 'https://shop.acme.com', type: 'WEBSITE' },
            { name: 'docs.acme.com', url: 'https://docs.acme.com', type: 'WEBSITE' },
            { name: 'app.acme.com', url: 'https://app.acme.com', type: 'WEBSITE' },
            { name: 'api.partner.com', url: 'https://api.partner.com', type: 'WEBSITE' },
            { name: 'legacy.acme.com', url: 'https://legacy.acme.com', type: 'WEBSITE' },
        ];
        const targetMap = {};
        for (const t of targetList) {
            const target = await this.prisma.target.create({
                data: {
                    name: t.name,
                    url: t.url,
                    type: t.type,
                    projectId: project.id,
                },
            });
            targetMap[t.name] = target.id;
        }
        await this.prisma.scan.create({
            data: {
                status: 'COMPLETED',
                scanType: 'QUICK',
                score: 82,
                duration: 154,
                targetId: targetMap['example.com'],
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
            },
        });
        await this.prisma.scan.create({
            data: {
                status: 'RUNNING',
                scanType: 'API_SECURITY',
                score: null,
                duration: 192,
                targetId: targetMap['api.acme.com'],
                createdAt: new Date(Date.now() - 1000 * 60 * 5),
            },
        });
        await this.prisma.scan.create({
            data: {
                status: 'QUEUED',
                scanType: 'REPOSITORY',
                score: null,
                duration: null,
                targetId: targetMap['github.com/acme/app'],
                createdAt: new Date(Date.now() - 1000 * 60 * 2),
            },
        });
        await this.prisma.scan.create({
            data: {
                status: 'FAILED',
                scanType: 'OWASP',
                score: 45,
                duration: 465,
                targetId: targetMap['shop.acme.com'],
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1.5),
            },
        });
        await this.prisma.scan.create({
            data: {
                status: 'COMPLETED',
                scanType: 'SSL',
                score: 92,
                duration: 78,
                targetId: targetMap['docs.acme.com'],
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
            },
        });
        await this.prisma.scan.create({
            data: {
                status: 'COMPLETED',
                scanType: 'DEEP',
                score: 88,
                duration: 1112,
                targetId: targetMap['app.acme.com'],
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
            },
        });
        await this.prisma.scan.create({
            data: {
                status: 'FAILED',
                scanType: 'API_SECURITY',
                score: 38,
                duration: 290,
                targetId: targetMap['api.partner.com'],
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3.5),
            },
        });
        await this.prisma.scan.create({
            data: {
                status: 'COMPLETED',
                scanType: 'QUICK',
                score: 76,
                duration: 130,
                targetId: targetMap['legacy.acme.com'],
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
            },
        });
        const mockCompletedTypes = ['QUICK', 'SSL', 'DEEP', 'API_SECURITY'];
        for (let i = 0; i < 90; i++) {
            const type = mockCompletedTypes[i % mockCompletedTypes.length];
            await this.prisma.scan.create({
                data: {
                    status: 'COMPLETED',
                    scanType: type,
                    score: Math.floor(Math.random() * 30) + 70,
                    duration: Math.floor(Math.random() * 500) + 60,
                    targetId: targetMap['example.com'],
                    createdAt: new Date(Date.now() - 1000 * 60 * 60 * (5 + i)),
                },
            });
        }
        for (let i = 0; i < 7; i++) {
            await this.prisma.scan.create({
                data: {
                    status: 'RUNNING',
                    scanType: 'API_SECURITY',
                    score: null,
                    duration: 120 + (i * 30),
                    targetId: targetMap['api.acme.com'],
                    createdAt: new Date(Date.now() - 1000 * 60 * (10 + i)),
                },
            });
        }
        for (let i = 0; i < 4; i++) {
            await this.prisma.scan.create({
                data: {
                    status: 'QUEUED',
                    scanType: 'REPOSITORY',
                    score: null,
                    duration: null,
                    targetId: targetMap['github.com/acme/app'],
                    createdAt: new Date(Date.now() - 1000 * 60 * (3 + i)),
                },
            });
        }
        for (let i = 0; i < 19; i++) {
            await this.prisma.scan.create({
                data: {
                    status: 'FAILED',
                    scanType: 'OWASP',
                    score: Math.floor(Math.random() * 45) + 10,
                    duration: Math.floor(Math.random() * 600) + 120,
                    targetId: targetMap['shop.acme.com'],
                    createdAt: new Date(Date.now() - 1000 * 60 * 60 * (24 * 2 + i)),
                },
            });
        }
        return {
            success: true,
            message: 'Account created successfully.',
        };
    }
    async login(dto) {
        const email = dto.email.toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new common_1.UnauthorizedException({
                success: false,
                message: 'Invalid credentials.',
            });
        }
        const isPasswordValid = await (0, password_1.comparePassword)(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException({
                success: false,
                message: 'Invalid credentials.',
            });
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException({
                success: false,
                message: 'User account has been deactivated.',
            });
        }
        const tokens = (0, jwt_1.generateTokens)(user.id, user.email);
        const tokenHash = this.hashToken(tokens.refreshToken);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.prisma.refreshToken.create({
            data: {
                tokenHash,
                userId: user.id,
                expiresAt,
            },
        });
        return {
            success: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
            },
        };
    }
    async logout(refreshToken) {
        if (!refreshToken) {
            return { success: true };
        }
        try {
            const tokenHash = this.hashToken(refreshToken);
            await this.prisma.refreshToken.deleteMany({
                where: { tokenHash },
            });
        }
        catch (e) {
        }
        return { success: true };
    }
    async refresh(refreshToken) {
        if (!refreshToken) {
            throw new common_1.UnauthorizedException({
                success: false,
                message: 'Refresh token is missing.',
            });
        }
        try {
            const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
            const tokenHash = this.hashToken(refreshToken);
            const storedToken = await this.prisma.refreshToken.findUnique({
                where: { tokenHash },
                include: { user: true },
            });
            if (!storedToken) {
                throw new common_1.UnauthorizedException({
                    success: false,
                    message: 'Refresh token has been revoked.',
                });
            }
            if (storedToken.expiresAt < new Date()) {
                await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
                throw new common_1.UnauthorizedException({
                    success: false,
                    message: 'Refresh token has expired.',
                });
            }
            if (!storedToken.user.isActive) {
                throw new common_1.UnauthorizedException({
                    success: false,
                    message: 'User account has been deactivated.',
                });
            }
            const tokens = (0, jwt_1.generateTokens)(storedToken.user.id, storedToken.user.email);
            await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
            const newHash = this.hashToken(tokens.refreshToken);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            await this.prisma.refreshToken.create({
                data: {
                    tokenHash: newHash,
                    userId: storedToken.user.id,
                    expiresAt,
                },
            });
            return {
                success: true,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.UnauthorizedException({
                success: false,
                message: 'Invalid refresh token.',
            });
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map