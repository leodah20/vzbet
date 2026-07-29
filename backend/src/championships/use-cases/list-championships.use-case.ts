import { Championship, ChampionshipRepository } from '../domain/championship-repository.interface';

export class ListChampionshipsUseCase {
  constructor(private readonly championshipRepository: ChampionshipRepository) {}

  execute(): Promise<Championship[]> {
    return this.championshipRepository.findAll();
  }
}
