import { CreateChampionshipUseCase } from './create-championship.use-case';
import { ChampionshipRepository } from '../domain/championship-repository.interface';

describe('CreateChampionshipUseCase', () => {
  function makeRepository(): jest.Mocked<ChampionshipRepository> {
    return { create: jest.fn(), findAll: jest.fn(), findById: jest.fn() };
  }

  it('creates a championship when the date range is valid', async () => {
    const repository = makeRepository();
    const input = {
      name: 'Copa do Bairro',
      season: '2026',
      format: 'PONTOS_CORRIDOS' as const,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-12-01'),
    };
    const created = { id: '1', ...input };
    repository.create.mockResolvedValue(created);
    const useCase = new CreateChampionshipUseCase(repository);

    const result = await useCase.execute(input);

    expect(result).toEqual(created);
  });

  it('throws when the end date is before the start date', async () => {
    const repository = makeRepository();
    const useCase = new CreateChampionshipUseCase(repository);

    await expect(
      useCase.execute({
        name: 'Copa do Bairro',
        season: '2026',
        format: 'PONTOS_CORRIDOS',
        startDate: new Date('2026-12-01'),
        endDate: new Date('2026-08-01'),
      }),
    ).rejects.toThrow('endDate must be after startDate');
    expect(repository.create).not.toHaveBeenCalled();
  });
});
