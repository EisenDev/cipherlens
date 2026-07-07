import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { ScansModule } from './scans/scans.module';

@Module({
  imports: [AuthModule, ScansModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
