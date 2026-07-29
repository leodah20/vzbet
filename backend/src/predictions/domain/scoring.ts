export interface MatchResult {
  homeScore: number;
  awayScore: number;
}

export type PredictedOutcome = 'CASA' | 'EMPATE' | 'FORA';

export interface PredictionGuess {
  predictedOutcome: PredictedOutcome;
  predictedHome: number | null;
  predictedAway: number | null;
}

function outcomeOf(home: number, away: number): PredictedOutcome {
  if (home > away) return 'CASA';
  if (home < away) return 'FORA';
  return 'EMPATE';
}

export function calculatePredictionPoints(guess: PredictionGuess, result: MatchResult): number {
  const actualOutcome = outcomeOf(result.homeScore, result.awayScore);
  const isMultipla = guess.predictedHome !== null && guess.predictedAway !== null;

  if (!isMultipla) {
    return guess.predictedOutcome === actualOutcome ? 3 : 0;
  }

  const scoreCorrect = guess.predictedHome === result.homeScore && guess.predictedAway === result.awayScore;
  return scoreCorrect ? 7 : 0;
}
