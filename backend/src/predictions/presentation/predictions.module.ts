import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller';
import { RankingController } from './ranking.controller';
import { PrismaPredictionRepository } from '../data/prisma-prediction.repository';
import { PREDICTION_REPOSITORY } from '../domain/prediction-repository.interface';
import { AuthModule } from '../../auth/presentation/auth.module';
import { MatchesModule } from '../../matches/presentation/matches.module';

@Module({
  imports: [AuthModule, MatchesModule],
  controllers: [PredictionsController, RankingController],
  providers: [{ provide: PREDICTION_REPOSITORY, useClass: PrismaPredictionRepository }],
})
export class PredictionsModule {}
