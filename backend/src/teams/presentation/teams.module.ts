import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { PrismaTeamRepository } from '../data/prisma-team.repository';
import { TEAM_REPOSITORY } from '../domain/team-repository.interface';
import { AuthModule } from '../../auth/presentation/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TeamsController],
  providers: [{ provide: TEAM_REPOSITORY, useClass: PrismaTeamRepository }],
  exports: [TEAM_REPOSITORY],
})
export class TeamsModule {}
