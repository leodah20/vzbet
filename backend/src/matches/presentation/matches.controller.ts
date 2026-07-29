import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/roles.guard';
import { Roles } from '../../auth/presentation/roles.decorator';
import { ScheduleMatchDto } from './dto/schedule-match.dto';
import { ScheduleMatchUseCase } from '../use-cases/schedule-match.use-case';
import { CancelMatchUseCase } from '../use-cases/cancel-match.use-case';
import { ListMatchesUseCase } from '../use-cases/list-matches.use-case';
import { MATCH_REPOSITORY } from '../domain/match-repository.interface';
import type { MatchRepository, MatchStatus } from '../domain/match-repository.interface';
import { TEAM_REPOSITORY } from '../../teams/domain/team-repository.interface';
import type { TeamRepository } from '../../teams/domain/team-repository.interface';
import { CHAMPIONSHIP_REPOSITORY } from '../../championships/domain/championship-repository.interface';
import type { ChampionshipRepository } from '../../championships/domain/championship-repository.interface';

@Controller('matches')
export class MatchesController {
  constructor(
    @Inject(MATCH_REPOSITORY) private readonly matchRepository: MatchRepository,
    @Inject(TEAM_REPOSITORY) private readonly teamRepository: TeamRepository,
    @Inject(CHAMPIONSHIP_REPOSITORY) private readonly championshipRepository: ChampionshipRepository,
  ) {}

  @Get()
  list(
    @Query('teamId') teamId?: string,
    @Query('championshipId') championshipId?: string,
    @Query('status') status?: MatchStatus,
  ) {
    return new ListMatchesUseCase(this.matchRepository).execute({ teamId, championshipId, status });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  schedule(@Body() dto: ScheduleMatchDto) {
    return new ScheduleMatchUseCase(this.matchRepository, this.teamRepository, this.championshipRepository).execute({
      ...dto,
      kickoffAt: new Date(dto.kickoffAt),
    });
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  cancel(@Param('id') id: string) {
    return new CancelMatchUseCase(this.matchRepository).execute(id);
  }
}
