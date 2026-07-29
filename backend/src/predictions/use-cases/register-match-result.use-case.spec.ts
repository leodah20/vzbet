import { RegisterMatchResultUseCase } from './register-match-result.use-case';
import { PredictionRepository } from '../domain/prediction-repository.interface';
import { MatchRepository } from '../../matches/domain/match-repository.interface';

describe('RegisterMatchResultUseCase', () => {
  function makePredictionRepository(): jest.Mocked<PredictionRepository> {
    return {
      upsert: jest.fn(),
      findByMatchId: jest.fn(),
      updatePoints: jest.fn(),
      registerResultAndScorePredictions: jest.fn(),
      findScoredPredictions: jest.fn(),
    };
  }
  function makeMatchRepository(): jest.Mocked<MatchRepository> {
    return { create: jest.fn(), findAll: jest.fn(), findById: jest.fn(), updateStatus: jest.fn(), registerResult: jest.fn() };
  }
  const scheduledMatch = {
    id: 'm1', championshipId: 'c', homeTeamId: 'h', awayTeamId: 'a', round: 1,
    kickoffAt: new Date('2026-08-10T15:00:00Z'), homeScore: null, awayScore: null, status: 'AGENDADA' as const,
  };

  it('registers the result and scores every prediction for the match', async () => {
    const predictionRepository = makePredictionRepository();
    const matchRepository = makeMatchRepository();
    matchRepository.findById.mockResolvedValue(scheduledMatch);
    predictionRepository.findByMatchId.mockResolvedValue([
      { id: 'p1', userId: 'u1', matchId: 'm1', predictedHome: 2, predictedAway: 1, pointsEarned: null },
      { id: 'p2', userId: 'u2', matchId: 'm1', predictedHome: 0, predictedAway: 0, pointsEarned: null },
    ]);
    const useCase = new RegisterMatchResultUseCase(matchRepository, predictionRepository);

    await useCase.execute({ matchId: 'm1', homeScore: 2, awayScore: 1 });

    expect(predictionRepository.registerResultAndScorePredictions).toHaveBeenCalledTimes(1);
    expect(predictionRepository.registerResultAndScorePredictions).toHaveBeenCalledWith(
      'm1',
      { homeScore: 2, awayScore: 1 },
      [
        { predictionId: 'p1', points: 3 },
        { predictionId: 'p2', points: 0 },
      ],
    );
  });

  it('throws when the match result was already registered', async () => {
    const predictionRepository = makePredictionRepository();
    const matchRepository = makeMatchRepository();
    matchRepository.findById.mockResolvedValue({ ...scheduledMatch, status: 'FINALIZADA' });
    const useCase = new RegisterMatchResultUseCase(matchRepository, predictionRepository);

    await expect(useCase.execute({ matchId: 'm1', homeScore: 1, awayScore: 0 })).rejects.toThrow(
      'Match result was already registered',
    );
    expect(predictionRepository.registerResultAndScorePredictions).not.toHaveBeenCalled();
  });

  it('throws when the match was cancelled', async () => {
    const predictionRepository = makePredictionRepository();
    const matchRepository = makeMatchRepository();
    matchRepository.findById.mockResolvedValue({ ...scheduledMatch, status: 'CANCELADA' });
    const useCase = new RegisterMatchResultUseCase(matchRepository, predictionRepository);

    await expect(useCase.execute({ matchId: 'm1', homeScore: 1, awayScore: 0 })).rejects.toThrow(
      'Cannot register a result for a cancelled match',
    );
    expect(predictionRepository.registerResultAndScorePredictions).not.toHaveBeenCalled();
  });
});
