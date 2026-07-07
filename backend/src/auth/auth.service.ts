import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma.service';
import { SignupDto, LoginDto } from './auth.validation';
import { hashPassword, comparePassword } from '../utils/password';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to hash a refresh token for secure database storage.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Handle user signup registration.
   */
  async signup(dto: SignupDto) {
    // 1. Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // 2. Hash password
    const passwordHash = await hashPassword(dto.password);

    // 3. Create user in the database
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

    // 4. Auto-seed workspace project, targets and scans for the new user
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

    const targetMap: Record<string, string> = {};

    for (const t of targetList) {
      const target = await this.prisma.target.create({
        data: {
          name: t.name,
          url: t.url,
          type: t.type as any,
          projectId: project.id,
        },
      });
      targetMap[t.name] = target.id;
    }

    // 1. Seed the 8 main scans visible on the first page
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

    // 2. Seed remaining scans to reach exactly:
    //    Completed: 94 (seeding 90 more)
    //    Running: 8 (seeding 7 more)
    //    Queued: 5 (seeding 4 more)
    //    Failed: 21 (seeding 19 more)
    //    Total = 128 scans
    const mockCompletedTypes = ['QUICK', 'SSL', 'DEEP', 'API_SECURITY'];
    for (let i = 0; i < 90; i++) {
      const type = mockCompletedTypes[i % mockCompletedTypes.length];
      await this.prisma.scan.create({
        data: {
          status: 'COMPLETED',
          scanType: type,
          score: Math.floor(Math.random() * 30) + 70, // 70-99
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

  /**
   * Handle user login authentication.
   */
  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();

    // 1. Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // 2. Compare passwords
    const isPasswordValid = await comparePassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        success: false,
        message: 'User account has been deactivated.',
      });
    }

    // 3. Generate tokens
    const tokens = generateTokens(user.id, user.email);

    // 4. Save hashed refresh token to the database
    const tokenHash = this.hashToken(tokens.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

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

  /**
   * Handle user logout (revokes/deletes refresh token).
   */
  async logout(refreshToken: string) {
    if (!refreshToken) {
      return { success: true };
    }

    try {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.deleteMany({
        where: { tokenHash },
      });
    } catch (e) {
      // Fail silently for security/UX resilience
    }

    return { success: true };
  }

  /**
   * Refresh access token using a valid refresh token.
   */
  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException({
        success: false,
        message: 'Refresh token is missing.',
      });
    }

    try {
      // 1. Verify token structure & expiry
      const decoded = verifyRefreshToken(refreshToken);

      // 2. Check token exists in database (not revoked)
      const tokenHash = this.hashToken(refreshToken);
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!storedToken) {
        throw new UnauthorizedException({
          success: false,
          message: 'Refresh token has been revoked.',
        });
      }

      if (storedToken.expiresAt < new Date()) {
        // Cleanup expired token
        await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
        throw new UnauthorizedException({
          success: false,
          message: 'Refresh token has expired.',
        });
      }

      if (!storedToken.user.isActive) {
        throw new UnauthorizedException({
          success: false,
          message: 'User account has been deactivated.',
        });
      }

      // 3. Generate new token pair (refresh token rotation)
      const tokens = generateTokens(storedToken.user.id, storedToken.user.email);

      // 4. Update the DB by rotating refresh token
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
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new UnauthorizedException({
        success: false,
        message: 'Invalid refresh token.',
      });
    }
  }
}
