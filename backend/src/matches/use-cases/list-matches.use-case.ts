import { Match, MatchFilter, MatchRepository } from '../domain/match-repository.interface';

export class ListMatchesUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  execute(filter?: MatchFilter): Promise<Match[]> {
    return this.matchRepository.findAll(filter);
  }
}
