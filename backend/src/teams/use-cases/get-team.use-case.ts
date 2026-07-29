import { Team, TeamRepository } from '../domain/team-repository.interface';
import { NotFoundError } from '../../shared/domain/errors';

export class GetTeamUseCase {
  constructor(private readonly teamRepository: TeamRepository) {}

  async execute(id: string): Promise<Team> {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      throw new NotFoundError('Team not found');
    }
    return team;
  }
}
