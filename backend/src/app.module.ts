import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/presentation/auth.module';
import { TeamsModule } from './teams/presentation/teams.module';

@Module({
  imports: [PrismaModule, AuthModule, TeamsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
