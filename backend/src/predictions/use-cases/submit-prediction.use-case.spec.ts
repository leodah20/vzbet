import { SubmitPredictionUseCase } from './submit-prediction.use-case';
import { PredictionRepository } from '../domain/prediction-repository.interface';
import { MatchRepository } from '../../matches/domain/match-repository.interface';
import { Clock } from '../../shared/domain/clock.interface';

describe('SubmitPredictionUseCase', () => {
  function makePredictionRepository(): jest.Mocked<PredictionRepository> {
    return {
      upsert: jest.fn(),
      findByMatchId: jest.fn(),
      findByUserId: jest.fn(),
      registerResultAndScorePredictions: jest.fn(),
      findScoredPredictions: jest.fn(),
    };
  }
  function makeMatchRepository(): jest.Mocked<MatchRepository> {
    return { create: jest.fn(), findAll: jest.fn(), findById: jest.fn(), updateStatus: jest.fn() };
  }
  function makeClock(fixedNow: Date): Clock {
    return { now: () => fixedNow };
  }
  const scheduledMatch = {
    id: 'm1', championshipId: 'c', homeTeamId: 'h', awayTeamId: 'a', round: 1,
    kickoffAt: new Date('2026-08-10T15:00:00Z'), homeScore: null, awayScore: null, status: 'AGENDADA' as const,
  };

  it('accepts a prediction submitted before kickoff', async () => {
    const predictionRepository = makePredictionRepository();
    const matchRepository = makeMatchRepository();
    matchRepository.findById.mockResolvedValue(scheduledMatch);
    const created = { id: 'p1', userId: 'u1', matchId: 'm1', predictedHome: 2, predictedAway: 1, pointsEarned: null };
    predictionRepository.upsert.mockResolvedValue(created);
    const clock = makeClock(new Date('2026-08-10T14:00:00Z'));
    const useCase = new SubmitPredictionUseCase(predictionRepository, matchRepository, clock);

    const result = await useCase.execute({ userId: 'u1', matchId: 'm1', predictedHome: 2, predictedAway: 1 });

    expect(result).toEqual(created);
  });

  it('rejects a prediction submitted after kickoff', async () => {
    const predictionRepository = makePredictionRepository();
    const matchRepository = makeMatchRepository();
    matchRepository.findById.mockResolvedValue(scheduledMatch);
    const clock = makeClock(new Date('2026-08-10T15:30:00Z'));
    const useCase = new SubmitPredictionUseCase(predictionRepository, matchRepository, clock);

    await expect(
      useCase.execute({ userId: 'u1', matchId: 'm1', predictedHome: 2, predictedAway: 1 }),
    ).rejects.toThrow('Prediction deadline has passed');
    expect(predictionRepository.upsert).not.toHaveBeenCalled();
  });

  it('rejects a prediction for a match that is not scheduled', async () => {
    const predictionRepository = makePredictionRepository();
    const matchRepository = makeMatchRepository();
    matchRepository.findById.mockResolvedValue({ ...scheduledMatch, status: 'CANCELADA' });
    const clock = makeClock(new Date('2026-08-10T14:00:00Z'));
    const useCase = new SubmitPredictionUseCase(predictionRepository, matchRepository, clock);

    await expect(
      useCase.execute({ userId: 'u1', matchId: 'm1', predictedHome: 2, predictedAway: 1 }),
    ).rejects.toThrow('Predictions are closed for this match');
  });

  it('rejects a negative predicted score', async () => {
    const predictionRepository = makePredictionRepository();
    const matchRepository = makeMatchRepository();
    matchRepository.findById.mockResolvedValue(scheduledMatch);
    const clock = makeClock(new Date('2026-08-10T14:00:00Z'));
    const useCase = new SubmitPredictionUseCase(predictionRepository, matchRepository, clock);

    await expect(
      useCase.execute({ userId: 'u1', matchId: 'm1', predictedHome: -1, predictedAway: 1 }),
    ).rejects.toThrow('Predicted score cannot be negative');
  });
});
