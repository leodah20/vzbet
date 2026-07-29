import { PredictionRepository, RankingEntry } from '../domain/prediction-repository.interface';

export class GetRankingUseCase {
  constructor(private readonly predictionRepository: PredictionRepository) {}

  execute(): Promise<RankingEntry[]> {
    return this.predictionRepository.getRanking();
  }
}
