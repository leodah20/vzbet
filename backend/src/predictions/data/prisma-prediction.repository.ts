import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prediction, PredictionRepository, SubmitPredictionData } from '../domain/prediction-repository.interface';

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

  findByUserId(userId: string): Promise<Prediction[]> {
    return this.prisma.prediction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  // This repository is nominally about predictions, but registering a match result and scoring
  // every prediction for that match must be a single atomic write across the Match and Prediction
  // tables (PrismaService is @Global(), so it's available here) — so the transaction is
  // orchestrated wherever that atomicity requirement lives, rather than being split across two
  // repositories and risking a partially-scored match with no way to retry.
  async registerResultAndScorePredictions(
    matchId: string,
    result: { homeScore: number; awayScore: number },
    scoredPredictions: { predictionId: string; points: number }[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.match.update({
        where: { id: matchId },
        data: { homeScore: result.homeScore, awayScore: result.awayScore, status: 'FINALIZADA' },
      }),
      ...scoredPredictions.map((sp) =>
        this.prisma.prediction.update({ where: { id: sp.predictionId }, data: { pointsEarned: sp.points } }),
      ),
    ]);
  }

  async findScoredPredictions(championshipId?: string): Promise<{ userId: string; userName: string; points: number }[]> {
    const predictions = await this.prisma.prediction.findMany({
      where: {
        pointsEarned: { not: null },
        ...(championshipId ? { match: { championshipId } } : {}),
      },
      select: {
        userId: true,
        pointsEarned: true,
        user: { select: { name: true } },
      },
    });

    return predictions.map((prediction) => ({
      userId: prediction.userId,
      userName: prediction.user.name,
      points: prediction.pointsEarned ?? 0,
    }));
  }
}
