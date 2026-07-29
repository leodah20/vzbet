import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/roles.guard';
import { Roles } from '../../auth/presentation/roles.decorator';
import { CreateChampionshipDto } from './dto/create-championship.dto';
import { CreateChampionshipUseCase } from '../use-cases/create-championship.use-case';
import { ListChampionshipsUseCase } from '../use-cases/list-championships.use-case';
import { CHAMPIONSHIP_REPOSITORY } from '../domain/championship-repository.interface';
import type { ChampionshipRepository } from '../domain/championship-repository.interface';

@Controller('championships')
export class ChampionshipsController {
  constructor(@Inject(CHAMPIONSHIP_REPOSITORY) private readonly championshipRepository: ChampionshipRepository) {}

  @Get()
  list() {
    return new ListChampionshipsUseCase(this.championshipRepository).execute();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateChampionshipDto) {
    return new CreateChampionshipUseCase(this.championshipRepository).execute({
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });
  }
}
