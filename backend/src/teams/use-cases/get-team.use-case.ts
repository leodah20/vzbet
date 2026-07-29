import { Team, TeamRepository } from '../domain/team-repository.interface';

export class GetTeamUseCase {
  constructor(private readonly teamRepository: TeamRepository) {}

  async execute(id: string): Promise<Team> {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      throw new Error('Team not found');
    }
    return team;
  }
}
