import { Team, TeamRepository } from '../domain/team-repository.interface';

export class ListTeamsUseCase {
  constructor(private readonly teamRepository: TeamRepository) {}

  execute(): Promise<Team[]> {
    return this.teamRepository.findAll();
  }
}
