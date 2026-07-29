import { Match, MatchRepository, ScheduleMatchData } from '../domain/match-repository.interface';
import { TeamRepository } from '../../teams/domain/team-repository.interface';
import { ChampionshipRepository } from '../../championships/domain/championship-repository.interface';
import { NotFoundError, ValidationError } from '../../shared/domain/errors';

export class ScheduleMatchUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly teamRepository: TeamRepository,
    private readonly championshipRepository: ChampionshipRepository,
  ) {}

  async execute(data: ScheduleMatchData): Promise<Match> {
    if (data.homeTeamId === data.awayTeamId) {
      throw new ValidationError('A team cannot play against itself');
    }

    const championship = await this.championshipRepository.findById(data.championshipId);
    if (!championship) {
      throw new NotFoundError('Championship not found');
    }

    const homeTeam = await this.teamRepository.findById(data.homeTeamId);
    if (!homeTeam) {
      throw new NotFoundError('Home team not found');
    }

    const awayTeam = await this.teamRepository.findById(data.awayTeamId);
    if (!awayTeam) {
      throw new NotFoundError('Away team not found');
    }

    return this.matchRepository.create(data);
  }
}
