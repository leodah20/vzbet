import { PredictionRepository, RankingEntry } from '../domain/prediction-repository.interface';

export class GetRankingUseCase {
  constructor(private readonly predictionRepository: PredictionRepository) {}

  async execute(championshipId?: string): Promise<RankingEntry[]> {
    const scoredPredictions = await this.predictionRepository.findScoredPredictions(championshipId);

    const totals = new Map<string, RankingEntry>();
    for (const { userId, userName, points } of scoredPredictions) {
      const existing = totals.get(userId);
      if (existing) {
        existing.totalPoints += points;
      } else {
        totals.set(userId, { userId, userName, totalPoints: points });
      }
    }

    return Array.from(totals.values()).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.userName.localeCompare(b.userName, 'pt-BR'); // tie-break: alphabetical by name
    });
  }
}
