import { Championship, ChampionshipRepository, CreateChampionshipData } from '../domain/championship-repository.interface';
import { ValidationError } from '../../shared/domain/errors';

export class CreateChampionshipUseCase {
  constructor(private readonly championshipRepository: ChampionshipRepository) {}

  async execute(data: CreateChampionshipData): Promise<Championship> {
    if (data.endDate.getTime() <= data.startDate.getTime()) {
      throw new ValidationError('endDate must be after startDate');
    }
    return this.championshipRepository.create(data);
  }
}
