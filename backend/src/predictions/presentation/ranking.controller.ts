import { Controller, Get, Inject } from '@nestjs/common';
import { GetRankingUseCase } from '../use-cases/get-ranking.use-case';
import { PREDICTION_REPOSITORY } from '../domain/prediction-repository.interface';
import type { PredictionRepository } from '../domain/prediction-repository.interface';

@Controller('ranking')
export class RankingController {
  constructor(@Inject(PREDICTION_REPOSITORY) private readonly predictionRepository: PredictionRepository) {}

  @Get()
  get() {
    return new GetRankingUseCase(this.predictionRepository).execute();
  }
}
