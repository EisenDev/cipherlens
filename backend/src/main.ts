import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './middleware/error.filter';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply security headers
  app.use(helmet());

  // Apply rate limiter on authentication endpoints
  app.use(
    '/api/auth/',
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Enable CORS for frontend integration
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:3005'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global exception filter for secure formatted responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Configure Swagger Document System
  const config = new DocumentBuilder()
    .setTitle('CipherLens API')
    .setDescription('AI-powered Security Intelligence Platform Auditing Controller')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`[CipherLens API] Running on http://localhost:${port}`);
  console.log(`[CipherLens Swagger] Documentation available on http://localhost:${port}/api`);
}
bootstrap();
