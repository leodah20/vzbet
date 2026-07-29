import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import type { PlayerRepository } from '../domain/player-repository.interface';
import type { TeamRepository } from '../../teams/domain/team-repository.interface';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/roles.guard';
import { Roles } from '../../auth/presentation/roles.decorator';
import { AddPlayerDto } from './dto/add-player.dto';
import { AddPlayerUseCase } from '../use-cases/add-player.use-case';
import { ListPlayersByTeamUseCase } from '../use-cases/list-players-by-team.use-case';
import { PLAYER_REPOSITORY } from '../domain/player-repository.interface';
import { TEAM_REPOSITORY } from '../../teams/domain/team-repository.interface';

@Controller('teams/:teamId/players')
export class PlayersController {
  constructor(
    @Inject(PLAYER_REPOSITORY) private readonly playerRepository: PlayerRepository,
    @Inject(TEAM_REPOSITORY) private readonly teamRepository: TeamRepository,
  ) {}

  @Get()
  list(@Param('teamId') teamId: string) {
    return new ListPlayersByTeamUseCase(this.playerRepository).execute(teamId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  add(@Param('teamId') teamId: string, @Body() dto: AddPlayerDto) {
    return new AddPlayerUseCase(this.playerRepository, this.teamRepository).execute({ ...dto, teamId });
  }
}
