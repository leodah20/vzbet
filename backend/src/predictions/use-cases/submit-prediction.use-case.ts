import { Prediction, PredictionRepository, SubmitPredictionData } from '../domain/prediction-repository.interface';
import { MatchRepository } from '../../matches/domain/match-repository.interface';
import { Clock } from '../../shared/domain/clock.interface';
import { NotFoundError, ValidationError } from '../../shared/domain/errors';

export class SubmitPredictionUseCase {
  constructor(
    private readonly predictionRepository: PredictionRepository,
    private readonly matchRepository: MatchRepository,
    private readonly clock: Clock,
  ) {}

  async execute(data: SubmitPredictionData): Promise<Prediction> {
    const match = await this.matchRepository.findById(data.matchId);
    if (!match) {
      throw new NotFoundError('Match not found');
    }
    if (match.status !== 'AGENDADA') {
      throw new ValidationError('Predictions are closed for this match');
    }
    if (this.clock.now().getTime() >= match.kickoffAt.getTime()) {
      throw new ValidationError('Prediction deadline has passed');
    }
    if (data.predictedHome < 0 || data.predictedAway < 0) {
      throw new ValidationError('Predicted score cannot be negative');
    }

    return this.predictionRepository.upsert(data);
  }
}
