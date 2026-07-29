import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/presentation/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
})
export class AppModule {}
