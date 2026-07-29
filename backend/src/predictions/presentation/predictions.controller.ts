import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/roles.guard';
import { Roles } from '../../auth/presentation/roles.decorator';
import { SubmitPredictionDto } from './dto/submit-prediction.dto';
import { RegisterResultDto } from './dto/register-result.dto';
import { SubmitPredictionUseCase } from '../use-cases/submit-prediction.use-case';
import { RegisterMatchResultUseCase } from '../use-cases/register-match-result.use-case';
import { ListMyPredictionsUseCase } from '../use-cases/list-my-predictions.use-case';
import { PREDICTION_REPOSITORY } from '../domain/prediction-repository.interface';
import type { PredictionRepository } from '../domain/prediction-repository.interface';
import { MATCH_REPOSITORY } from '../../matches/domain/match-repository.interface';
import type { MatchRepository } from '../../matches/domain/match-repository.interface';
import { SystemClock } from '../../shared/data/system-clock';

@Controller()
export class PredictionsController {
  constructor(
    @Inject(PREDICTION_REPOSITORY) private readonly predictionRepository: PredictionRepository,
    @Inject(MATCH_REPOSITORY) private readonly matchRepository: MatchRepository,
  ) {}

  @Post('predictions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TORCEDOR')
  submit(@Req() req: any, @Body() dto: SubmitPredictionDto) {
    const useCase = new SubmitPredictionUseCase(this.predictionRepository, this.matchRepository, new SystemClock());
    return useCase.execute({ userId: req.user.userId, ...dto });
  }

  @Get('predictions/me')
  @UseGuards(JwtAuthGuard)
  list(@Req() req: any) {
    return new ListMyPredictionsUseCase(this.predictionRepository).execute(req.user.userId);
  }

  @Post('matches/:id/result')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  registerResult(@Param('id') matchId: string, @Body() dto: RegisterResultDto) {
    const useCase = new RegisterMatchResultUseCase(this.matchRepository, this.predictionRepository);
    return useCase.execute({ matchId, ...dto });
  }
}
