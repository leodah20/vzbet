import { ScheduleMatchUseCase } from './schedule-match.use-case';
import { MatchRepository } from '../domain/match-repository.interface';
import { TeamRepository } from '../../teams/domain/team-repository.interface';
import { ChampionshipRepository } from '../../championships/domain/championship-repository.interface';

describe('ScheduleMatchUseCase', () => {
  function makeMatchRepository(): jest.Mocked<MatchRepository> {
    return { create: jest.fn(), findAll: jest.fn(), findById: jest.fn(), updateStatus: jest.fn(), registerResult: jest.fn() };
  }
  function makeTeamRepository(): jest.Mocked<TeamRepository> {
    return { create: jest.fn(), findAll: jest.fn(), findById: jest.fn() };
  }
  function makeChampionshipRepository(): jest.Mocked<ChampionshipRepository> {
    return { create: jest.fn(), findAll: jest.fn(), findById: jest.fn() };
  }
  const anyTeam = { id: 't', name: 'T', region: 'R', foundedYear: null, logoUrl: null, description: null };
  const anyChampionship = { id: 'c', name: 'C', season: '2026', format: 'PONTOS_CORRIDOS' as const, startDate: new Date(), endDate: new Date() };

  it('schedules a match when teams and championship exist and are different teams', async () => {
    const matchRepository = makeMatchRepository();
    const teamRepository = makeTeamRepository();
    const championshipRepository = makeChampionshipRepository();
    teamRepository.findById.mockResolvedValue(anyTeam);
    championshipRepository.findById.mockResolvedValue(anyChampionship);
    const created = {
      id: 'm1', championshipId: 'c', homeTeamId: 'home', awayTeamId: 'away', round: 1,
      kickoffAt: new Date('2026-08-10T15:00:00Z'), homeScore: null, awayScore: null, status: 'AGENDADA' as const,
    };
    matchRepository.create.mockResolvedValue(created);
    const useCase = new ScheduleMatchUseCase(matchRepository, teamRepository, championshipRepository);

    const result = await useCase.execute({
      championshipId: 'c', homeTeamId: 'home', awayTeamId: 'away', round: 1, kickoffAt: new Date('2026-08-10T15:00:00Z'),
    });

    expect(result).toEqual(created);
  });

  it('throws when home and away teams are the same', async () => {
    const matchRepository = makeMatchRepository();
    const teamRepository = makeTeamRepository();
    const championshipRepository = makeChampionshipRepository();
    teamRepository.findById.mockResolvedValue(anyTeam);
    championshipRepository.findById.mockResolvedValue(anyChampionship);
    const useCase = new ScheduleMatchUseCase(matchRepository, teamRepository, championshipRepository);

    await expect(
      useCase.execute({ championshipId: 'c', homeTeamId: 'same', awayTeamId: 'same', round: 1, kickoffAt: new Date() }),
    ).rejects.toThrow('A team cannot play against itself');
    expect(matchRepository.create).not.toHaveBeenCalled();
  });
});
