export interface MatchResult {
  homeScore: number;
  awayScore: number;
}

export interface PredictionGuess {
  predictedHome: number;
  predictedAway: number;
}

type Outcome = 'HOME' | 'AWAY' | 'DRAW';

function outcomeOf(home: number, away: number): Outcome {
  if (home > away) return 'HOME';
  if (home < away) return 'AWAY';
  return 'DRAW';
}

export function calculatePredictionPoints(guess: PredictionGuess, result: MatchResult): number {
  const isExactScore = guess.predictedHome === result.homeScore && guess.predictedAway === result.awayScore;
  if (isExactScore) {
    return 3;
  }

  const guessedOutcome = outcomeOf(guess.predictedHome, guess.predictedAway);
  const actualOutcome = outcomeOf(result.homeScore, result.awayScore);
  if (guessedOutcome === actualOutcome) {
    return 1;
  }

  return 0;
}
