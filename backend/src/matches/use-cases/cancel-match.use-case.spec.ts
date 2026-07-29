import { CancelMatchUseCase } from './cancel-match.use-case';
import { MatchRepository } from '../domain/match-repository.interface';

describe('CancelMatchUseCase', () => {
  function makeRepository(): jest.Mocked<MatchRepository> {
    return { create: jest.fn(), findAll: jest.fn(), findById: jest.fn(), updateStatus: jest.fn() };
  }
  const scheduledMatch = {
    id: 'm1', championshipId: 'c', homeTeamId: 'h', awayTeamId: 'a', round: 1,
    kickoffAt: new Date(), homeScore: null, awayScore: null, status: 'AGENDADA' as const,
  };

  it('cancels a scheduled match', async () => {
    const repository = makeRepository();
    repository.findById.mockResolvedValue(scheduledMatch);
    const useCase = new CancelMatchUseCase(repository);

    await useCase.execute('m1');

    expect(repository.updateStatus).toHaveBeenCalledWith('m1', 'CANCELADA');
  });

  it('throws when the match is already finished', async () => {
    const repository = makeRepository();
    repository.findById.mockResolvedValue({ ...scheduledMatch, status: 'FINALIZADA' });
    const useCase = new CancelMatchUseCase(repository);

    await expect(useCase.execute('m1')).rejects.toThrow('Cannot cancel a match that already finished');
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });
});
