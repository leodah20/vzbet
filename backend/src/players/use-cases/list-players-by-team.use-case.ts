import { Player, PlayerRepository } from '../domain/player-repository.interface';

export class ListPlayersByTeamUseCase {
  constructor(private readonly playerRepository: PlayerRepository) {}

  execute(teamId: string): Promise<Player[]> {
    return this.playerRepository.findByTeamId(teamId);
  }
}
