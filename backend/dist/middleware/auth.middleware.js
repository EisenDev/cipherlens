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
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("../utils/jwt");
const prisma_service_1 = require("../prisma.service");
let AuthGuard = class AuthGuard {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new common_1.UnauthorizedException({
                success: false,
                message: 'Access token is missing.',
            });
        }
        try {
            const decoded = (0, jwt_1.verifyAccessToken)(token);
            const user = await this.prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    companyName: true,
                    teamSize: true,
                    role: true,
                    isActive: true,
                },
            });
            if (!user) {
                throw new common_1.UnauthorizedException({
                    success: false,
                    message: 'User account not found.',
                });
            }
            if (!user.isActive) {
                throw new common_1.UnauthorizedException({
                    success: false,
                    message: 'User account has been deactivated.',
                });
            }
            request.user = user;
            return true;
        }
        catch (error) {
            throw new common_1.UnauthorizedException({
                success: false,
                message: 'Invalid or expired access token.',
            });
        }
    }
    extractTokenFromHeader(request) {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthGuard);
//# sourceMappingURL=auth.middleware.js.map