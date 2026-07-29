import { CreateTeamUseCase } from './create-team.use-case';
import { TeamRepository } from '../domain/team-repository.interface';

describe('CreateTeamUseCase', () => {
  function makeRepository(): jest.Mocked<TeamRepository> {
    return { create: jest.fn(), findAll: jest.fn(), findById: jest.fn() };
  }

  it('creates a team when a name and region are provided', async () => {
    const repository = makeRepository();
    const created = { id: '1', name: 'Vila Nova FC', region: 'Zona Leste', foundedYear: null, logoUrl: null, description: null };
    repository.create.mockResolvedValue(created);
    const useCase = new CreateTeamUseCase(repository);

    const result = await useCase.execute({ name: 'Vila Nova FC', region: 'Zona Leste' });

    expect(result).toEqual(created);
  });

  it('throws when the name is blank', async () => {
    const repository = makeRepository();
    const useCase = new CreateTeamUseCase(repository);

    await expect(useCase.execute({ name: '   ', region: 'Zona Leste' })).rejects.toThrow('Team name is required');
    expect(repository.create).not.toHaveBeenCalled();
  });
});
