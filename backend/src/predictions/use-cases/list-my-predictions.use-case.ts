import { Prediction, PredictionRepository } from '../domain/prediction-repository.interface';

export class ListMyPredictionsUseCase {
  constructor(private readonly predictionRepository: PredictionRepository) {}

  execute(userId: string): Promise<Prediction[]> {
    return this.predictionRepository.findByUserId(userId);
  }
}
