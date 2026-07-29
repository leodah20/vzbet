import { MatchRepository } from '../domain/match-repository.interface';
import { NotFoundError, ValidationError } from '../../shared/domain/errors';

export class CancelMatchUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(matchId: string): Promise<void> {
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundError('Match not found');
    }
    if (match.status === 'FINALIZADA') {
      throw new ValidationError('Cannot cancel a match that already finished');
    }
    await this.matchRepository.updateStatus(matchId, 'CANCELADA');
  }
}
