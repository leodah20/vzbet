import { CreateTeamData, Team, TeamRepository } from '../domain/team-repository.interface';

export class CreateTeamUseCase {
  constructor(private readonly teamRepository: TeamRepository) {}

  async execute(data: CreateTeamData): Promise<Team> {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Team name is required');
    }
    return this.teamRepository.create(data);
  }
}
