import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prediction, PredictionRepository, RankingEntry, SubmitPredictionData } from '../domain/prediction-repository.interface';

@Injectable()
export class PrismaPredictionRepository implements PredictionRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsert(data: SubmitPredictionData): Promise<Prediction> {
    return this.prisma.prediction.upsert({
      where: { userId_matchId: { userId: data.userId, matchId: data.matchId } },
      update: { predictedHome: data.predictedHome, predictedAway: data.predictedAway },
      create: data,
    });
  }

  findByMatchId(matchId: string): Promise<Prediction[]> {
    return this.prisma.prediction.findMany({ where: { matchId } });
  }

  async updatePoints(id: string, points: number): Promise<void> {
    await this.prisma.prediction.update({ where: { id }, data: { pointsEarned: points } });
  }

  async getRanking(): Promise<RankingEntry[]> {
    const predictions = await this.prisma.prediction.findMany({
      where: { pointsEarned: { not: null } },
      include: { user: true },
    });

    const totals = new Map<string, RankingEntry>();
    for (const prediction of predictions) {
      const existing = totals.get(prediction.userId);
      const points = prediction.pointsEarned ?? 0;
      if (existing) {
        existing.totalPoints += points;
      } else {
        totals.set(prediction.userId, { userId: prediction.userId, userName: prediction.user.name, totalPoints: points });
      }
    }

    return Array.from(totals.values()).sort((a, b) => b.totalPoints - a.totalPoints);
  }
}
