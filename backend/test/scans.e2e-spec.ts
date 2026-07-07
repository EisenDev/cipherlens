import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('ScansController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = 'scan.test.user@cipherlens.com';
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up test records
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });

    // Sign up a user (which will auto-seed default target and scans)
    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        fullName: 'Scan Tester',
        email: testEmail,
        password: 'password123',
        confirmPassword: 'password123',
        companyName: 'Acme Corp',
        role: 'security',
      });

    // Log in to get accessToken
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'password123',
      });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    await app.close();
  });

  describe('GET /api/dashboard/scan-summary', () => {
    it('should reject requests without authorization', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dashboard/scan-summary');
      expect(response.status).toBe(401);
    });

    it('should return aggregated summary stats for authorized user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dashboard/scan-summary')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(128); // Seeding inserts 128 scans
      expect(response.body.completed).toBe(94);
      expect(response.body.running).toBe(8);
      expect(response.body.queued).toBe(5);
      expect(response.body.failed).toBe(21);
    });
  });

  describe('GET /api/scans', () => {
    it('should return paginated list of scans', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/scans')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.current_page).toBe(1);
      expect(response.body.per_page).toBe(10);
      expect(response.body.total).toBe(128);
      expect(response.body.last_page).toBe(13);
      expect(response.body.data.length).toBe(10);
      expect(response.body.data[0].target).toBeDefined();
      expect(response.body.data[0].target.name).toBeDefined();
    });

    it('should filter scans by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/scans?status=completed')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10); // page size is 10
      response.body.data.forEach((scan: any) => {
        expect(scan.status).toBe('COMPLETED');
      });
    });

    it('should search scans by target name', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/scans?search=example.com')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10); // matches 91 results, page size is 10
      expect(response.body.data[0].target.name).toBe('example.com');
    });

    it('should filter scans by asset_type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/scans?asset_type=repository')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(5); // exactly 5 repo scans in database
      expect(response.body.data[0].target.type).toBe('REPOSITORY');
    });
  });
});
