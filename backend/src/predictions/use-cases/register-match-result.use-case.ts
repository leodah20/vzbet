import { calculatePredictionPoints } from '../domain/scoring';
import { PredictionRepository } from '../domain/prediction-repository.interface';
import { MatchRepository } from '../../matches/domain/match-repository.interface';
import { NotFoundError, ValidationError } from '../../shared/domain/errors';

export interface RegisterMatchResultData {
  matchId: string;
  homeScore: number;
  awayScore: number;
}

export class RegisterMatchResultUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly predictionRepository: PredictionRepository,
  ) {}

  async execute(data: RegisterMatchResultData): Promise<void> {
    const match = await this.matchRepository.findById(data.matchId);
    if (!match) {
      throw new NotFoundError('Match not found');
    }
    if (match.status === 'FINALIZADA') {
      throw new ValidationError('Match result was already registered');
    }
    if (match.status === 'CANCELADA') {
      throw new ValidationError('Cannot register a result for a cancelled match');
    }
    if (data.homeScore < 0 || data.awayScore < 0) {
      throw new ValidationError('Score cannot be negative');
    }

    const predictions = await this.predictionRepository.findByMatchId(data.matchId);
    const scoredPredictions = predictions.map((prediction) => ({
      predictionId: prediction.id,
      points: calculatePredictionPoints(
        {
          predictedOutcome: prediction.predictedOutcome,
          predictedHome: prediction.predictedHome,
          predictedAway: prediction.predictedAway,
        },
        { homeScore: data.homeScore, awayScore: data.awayScore },
      ),
    }));

    await this.predictionRepository.registerResultAndScorePredictions(
      data.matchId,
      { homeScore: data.homeScore, awayScore: data.awayScore },
      scoredPredictions,
    );
  }
}
