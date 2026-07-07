import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { PrismaService } from '../prisma.service';

/**
 * Authentication Guard to protect backend endpoints.
 * Verifies JWT from the Authorization header and attaches the user object.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: any }>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException({
        success: false,
        message: 'Access token is missing.',
      });
    }

    try {
      // 1. Verify access token
      const decoded = verifyAccessToken(token);

      // 2. Fetch user from database
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
        throw new UnauthorizedException({
          success: false,
          message: 'User account not found.',
        });
      }

      if (!user.isActive) {
        throw new UnauthorizedException({
          success: false,
          message: 'User account has been deactivated.',
        });
      }

      // 3. Attach user object to the request context
      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException({
        success: false,
        message: 'Invalid or expired access token.',
      });
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
