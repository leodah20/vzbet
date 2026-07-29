import { Module } from '@nestjs/common';
import { ChampionshipsController } from './championships.controller';
import { PrismaChampionshipRepository } from '../data/prisma-championship.repository';
import { CHAMPIONSHIP_REPOSITORY } from '../domain/championship-repository.interface';
import { AuthModule } from '../../auth/presentation/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ChampionshipsController],
  providers: [{ provide: CHAMPIONSHIP_REPOSITORY, useClass: PrismaChampionshipRepository }],
  exports: [CHAMPIONSHIP_REPOSITORY],
})
export class ChampionshipsModule {}
