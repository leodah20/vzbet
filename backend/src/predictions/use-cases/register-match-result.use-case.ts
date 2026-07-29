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
    if (data.homeScore < 0 || data.awayScore < 0) {
      throw new ValidationError('Score cannot be negative');
    }

    await this.matchRepository.registerResult(data.matchId, data.homeScore, data.awayScore);

    const predictions = await this.predictionRepository.findByMatchId(data.matchId);
    for (const prediction of predictions) {
      const points = calculatePredictionPoints(
        { predictedHome: prediction.predictedHome, predictedAway: prediction.predictedAway },
        { homeScore: data.homeScore, awayScore: data.awayScore },
      );
      await this.predictionRepository.updatePoints(prediction.id, points);
    }
  }
}
