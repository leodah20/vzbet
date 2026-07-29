import { GetRankingUseCase } from './get-ranking.use-case';
import { PredictionRepository } from '../domain/prediction-repository.interface';

describe('GetRankingUseCase', () => {
  function makePredictionRepository(): jest.Mocked<PredictionRepository> {
    return {
      upsert: jest.fn(),
      findByMatchId: jest.fn(),
      updatePoints: jest.fn(),
      registerResultAndScorePredictions: jest.fn(),
      findScoredPredictions: jest.fn(),
    };
  }

  it('sums points across multiple scored predictions for the same user', async () => {
    const predictionRepository = makePredictionRepository();
    predictionRepository.findScoredPredictions.mockResolvedValue([
      { userId: 'u1', userName: 'Alice', points: 3 },
      { userId: 'u1', userName: 'Alice', points: 1 },
    ]);
    const useCase = new GetRankingUseCase(predictionRepository);

    const ranking = await useCase.execute();

    expect(ranking).toEqual([{ userId: 'u1', userName: 'Alice', totalPoints: 4 }]);
  });

  it('sorts entries by total points descending', async () => {
    const predictionRepository = makePredictionRepository();
    predictionRepository.findScoredPredictions.mockResolvedValue([
      { userId: 'u1', userName: 'Alice', points: 1 },
      { userId: 'u2', userName: 'Bob', points: 3 },
      { userId: 'u3', userName: 'Carol', points: 2 },
    ]);
    const useCase = new GetRankingUseCase(predictionRepository);

    const ranking = await useCase.execute();

    expect(ranking.map((entry) => entry.userId)).toEqual(['u2', 'u3', 'u1']);
  });

  it('breaks ties alphabetically by user name', async () => {
    const predictionRepository = makePredictionRepository();
    predictionRepository.findScoredPredictions.mockResolvedValue([
      { userId: 'u1', userName: 'Zoe', points: 3 },
      { userId: 'u2', userName: 'Amanda', points: 3 },
    ]);
    const useCase = new GetRankingUseCase(predictionRepository);

    const ranking = await useCase.execute();

    expect(ranking.map((entry) => entry.userName)).toEqual(['Amanda', 'Zoe']);
  });

  it('passes the championshipId through to the repository unchanged', async () => {
    const predictionRepository = makePredictionRepository();
    predictionRepository.findScoredPredictions.mockResolvedValue([]);
    const useCase = new GetRankingUseCase(predictionRepository);

    await useCase.execute('champ-123');

    expect(predictionRepository.findScoredPredictions).toHaveBeenCalledWith('champ-123');
  });

  it('passes undefined through to the repository when no championshipId is given', async () => {
    const predictionRepository = makePredictionRepository();
    predictionRepository.findScoredPredictions.mockResolvedValue([]);
    const useCase = new GetRankingUseCase(predictionRepository);

    await useCase.execute();

    expect(predictionRepository.findScoredPredictions).toHaveBeenCalledWith(undefined);
  });
});
