import { Prediction, PredictionRepository, SubmitPredictionData } from '../domain/prediction-repository.interface';
import { MatchRepository } from '../../matches/domain/match-repository.interface';
import { Clock } from '../../shared/domain/clock.interface';
import { NotFoundError, ValidationError } from '../../shared/domain/errors';

function outcomeOf(home: number, away: number): 'CASA' | 'EMPATE' | 'FORA' {
  if (home > away) return 'CASA';
  if (home < away) return 'FORA';
  return 'EMPATE';
}

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

    const hasHome = data.predictedHome !== null && data.predictedHome !== undefined;
    const hasAway = data.predictedAway !== null && data.predictedAway !== undefined;
    if (hasHome !== hasAway) {
      throw new ValidationError('Both predictedHome and predictedAway must be provided together, or neither');
    }

    if (hasHome && hasAway) {
      if (data.predictedHome! < 0 || data.predictedAway! < 0) {
        throw new ValidationError('Predicted score cannot be negative');
      }
      const derivedOutcome = outcomeOf(data.predictedHome!, data.predictedAway!);
      if (derivedOutcome !== data.predictedOutcome) {
        throw new ValidationError('predictedOutcome is inconsistent with the predicted score');
      }
    }

    return this.predictionRepository.upsert(data);
  }
}
