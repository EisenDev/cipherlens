"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const swagger_1 = require("@nestjs/swagger");
const error_filter_1 = require("./middleware/error.filter");
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)());
    app.use('/api/auth/', (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: {
            success: false,
            message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    }));
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
    app.useGlobalFilters(new error_filter_1.GlobalExceptionFilter());
    const config = new swagger_1.DocumentBuilder()
        .setTitle('CipherLens API')
        .setDescription('AI-powered Security Intelligence Platform Auditing Controller')
        .setVersion('0.1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document);
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`[CipherLens API] Running on http://localhost:${port}`);
    console.log(`[CipherLens Swagger] Documentation available on http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map