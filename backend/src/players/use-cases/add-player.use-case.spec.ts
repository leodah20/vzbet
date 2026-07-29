import { AddPlayerUseCase } from './add-player.use-case';
import { PlayerRepository } from '../domain/player-repository.interface';
import { TeamRepository } from '../../teams/domain/team-repository.interface';
import { NotFoundError } from '../../shared/domain/errors';

describe('AddPlayerUseCase', () => {
  function makePlayerRepository(): jest.Mocked<PlayerRepository> {
    return { create: jest.fn(), findByTeamId: jest.fn() };
  }
  function makeTeamRepository(): jest.Mocked<TeamRepository> {
    return { create: jest.fn(), findAll: jest.fn(), findById: jest.fn() };
  }

  it('adds a player when the team exists', async () => {
    const playerRepository = makePlayerRepository();
    const teamRepository = makeTeamRepository();
    teamRepository.findById.mockResolvedValue({ id: 'team-1', name: 'Vila Nova FC', region: 'Zona Leste', foundedYear: null, logoUrl: null, description: null });
    const created = { id: 'player-1', name: 'Carlinhos', position: 'Atacante', number: 9, photoUrl: null, teamId: 'team-1' };
    playerRepository.create.mockResolvedValue(created);
    const useCase = new AddPlayerUseCase(playerRepository, teamRepository);

    const result = await useCase.execute({ name: 'Carlinhos', position: 'Atacante', number: 9, teamId: 'team-1' });

    expect(result).toEqual(created);
  });

  it('throws NotFoundError when the team does not exist', async () => {
    const playerRepository = makePlayerRepository();
    const teamRepository = makeTeamRepository();
    teamRepository.findById.mockResolvedValue(null);
    const useCase = new AddPlayerUseCase(playerRepository, teamRepository);

    await expect(
      useCase.execute({ name: 'Carlinhos', position: 'Atacante', number: 9, teamId: 'ghost' }),
    ).rejects.toThrow(NotFoundError);
    expect(playerRepository.create).not.toHaveBeenCalled();
  });
});
