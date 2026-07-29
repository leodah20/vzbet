export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  predictedHome: number;
  predictedAway: number;
  pointsEarned: number | null;
}

export interface SubmitPredictionData {
  userId: string;
  matchId: string;
  predictedHome: number;
  predictedAway: number;
}

export interface RankingEntry {
  userId: string;
  userName: string;
  totalPoints: number;
}

export interface PredictionRepository {
  upsert(data: SubmitPredictionData): Promise<Prediction>;
  findByMatchId(matchId: string): Promise<Prediction[]>;
  updatePoints(id: string, points: number): Promise<void>;
  registerResultAndScorePredictions(
    matchId: string,
    result: { homeScore: number; awayScore: number },
    scoredPredictions: { predictionId: string; points: number }[],
  ): Promise<void>;
  getRanking(): Promise<RankingEntry[]>;
}

export const PREDICTION_REPOSITORY = Symbol('PREDICTION_REPOSITORY');
