import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = 'test.user@cipherlens.com';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up any stale test records from previous runs
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    await app.close();
  });

  describe('POST /api/auth/signup', () => {
    it('should fail with validation errors if inputs are invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          fullName: '',
          email: 'invalid-email',
          password: '123',
          confirmPassword: '456',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should successfully create a new user account', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          fullName: 'Test User',
          email: testEmail,
          password: 'securePassword123',
          confirmPassword: 'securePassword123',
          companyName: 'CipherLens Corp',
          teamSize: '5-10',
          role: 'Developer',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Account created successfully.');
    });

    it('should fail if email is already registered', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          fullName: 'Duplicate User',
          email: testEmail,
          password: 'securePassword123',
          confirmPassword: 'securePassword123',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should fail with invalid credentials for wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'wrongPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should succeed and return auth tokens & user object', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'securePassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.user.fullName).toBe('Test User');
      expect(response.body.user.passwordHash).toBeUndefined();
    });
  });

  describe('Auth Lifecycle (Profile, Refresh, Logout)', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'securePassword123',
        });
      accessToken = loginRes.body.accessToken;
      refreshToken = loginRes.body.refreshToken;
    });

    it('GET /api/auth/me should fetch the authenticated user profile', async () => {
      const meRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.email).toBe(testEmail);
      expect(meRes.body.fullName).toBe('Test User');
      expect(meRes.body.companyName).toBe('CipherLens Corp');
      expect(meRes.body.teamSize).toBe('5-10');
      expect(meRes.body.role).toBe('Developer');
      expect(meRes.body.isActive).toBe(true);
    });

    it('GET /api/auth/me should reject request with invalid or missing token', async () => {
      const meRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer invalid-token`);

      expect(meRes.status).toBe(401);
      expect(meRes.body.success).toBe(false);
    });

    it('POST /api/auth/refresh should rotate active session tokens', async () => {
      const refreshRes = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.accessToken).toBeDefined();
      expect(refreshRes.body.refreshToken).toBeDefined();
    });

    it('POST /api/auth/logout should revoke the refresh token and block subsequent refreshes', async () => {
      const logoutRes = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Attempting to refresh should now be blocked
      const secondRefresh = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(secondRefresh.status).toBe(401);
      expect(secondRefresh.body.message).toContain('revoked');
    });
  });
});
