import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { PrismaMatchRepository } from '../data/prisma-match.repository';
import { MATCH_REPOSITORY } from '../domain/match-repository.interface';
import { AuthModule } from '../../auth/presentation/auth.module';
import { TeamsModule } from '../../teams/presentation/teams.module';
import { ChampionshipsModule } from '../../championships/presentation/championships.module';

@Module({
  imports: [AuthModule, TeamsModule, ChampionshipsModule],
  controllers: [MatchesController],
  providers: [{ provide: MATCH_REPOSITORY, useClass: PrismaMatchRepository }],
  exports: [MATCH_REPOSITORY],
})
export class MatchesModule {}
