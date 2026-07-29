import { CreatePlayerData, Player, PlayerRepository } from '../domain/player-repository.interface';
import { TeamRepository } from '../../teams/domain/team-repository.interface';
import { NotFoundError } from '../../shared/domain/errors';

export class AddPlayerUseCase {
  constructor(
    private readonly playerRepository: PlayerRepository,
    private readonly teamRepository: TeamRepository,
  ) {}

  async execute(data: CreatePlayerData): Promise<Player> {
    const team = await this.teamRepository.findById(data.teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }
    return this.playerRepository.create(data);
  }
}
