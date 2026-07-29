import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { PrismaUserRepository } from '../data/prisma-user.repository';
import { USER_REPOSITORY } from '../domain/user-repository.interface';
import { getRequiredEnv } from '../../shared/data/get-required-env';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: getRequiredEnv('JWT_SECRET'),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    RolesGuard,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  exports: [USER_REPOSITORY, JwtModule, RolesGuard],
})
export class AuthModule {}
