import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/roles.guard';
import { Roles } from '../../auth/presentation/roles.decorator';
import { CreateTeamDto } from './dto/create-team.dto';
import { CreateTeamUseCase } from '../use-cases/create-team.use-case';
import { ListTeamsUseCase } from '../use-cases/list-teams.use-case';
import { GetTeamUseCase } from '../use-cases/get-team.use-case';
import { TEAM_REPOSITORY } from '../domain/team-repository.interface';
import type { TeamRepository } from '../domain/team-repository.interface';

@Controller('teams')
export class TeamsController {
  constructor(@Inject(TEAM_REPOSITORY) private readonly teamRepository: TeamRepository) {}

  @Get()
  list() {
    return new ListTeamsUseCase(this.teamRepository).execute();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return new GetTeamUseCase(this.teamRepository).execute(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateTeamDto) {
    return new CreateTeamUseCase(this.teamRepository).execute(dto);
  }
}
