import { Match, MatchRepository } from '../domain/match-repository.interface';

export class ListMatchesUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  execute(): Promise<Match[]> {
    return this.matchRepository.findAll();
  }
}
