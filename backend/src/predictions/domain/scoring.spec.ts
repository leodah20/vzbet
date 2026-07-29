import { calculatePredictionPoints } from './scoring';

describe('calculatePredictionPoints', () => {
  it('awards 3 points for a correct simple outcome guess (no score given)', () => {
    const points = calculatePredictionPoints(
      { predictedOutcome: 'CASA', predictedHome: null, predictedAway: null },
      { homeScore: 2, awayScore: 0 },
    );
    expect(points).toBe(3);
  });

  it('awards 0 points for a wrong simple outcome guess', () => {
    const points = calculatePredictionPoints(
      { predictedOutcome: 'EMPATE', predictedHome: null, predictedAway: null },
      { homeScore: 2, awayScore: 0 },
    );
    expect(points).toBe(0);
  });

  it('awards 7 points for a correct múltipla (outcome + exact score both right)', () => {
    const points = calculatePredictionPoints(
      { predictedOutcome: 'CASA', predictedHome: 2, predictedAway: 1 },
      { homeScore: 2, awayScore: 1 },
    );
    expect(points).toBe(7);
  });

  it('awards 0 points for a múltipla with the right outcome but the wrong exact score (all-or-nothing)', () => {
    const points = calculatePredictionPoints(
      { predictedOutcome: 'CASA', predictedHome: 2, predictedAway: 1 },
      { homeScore: 3, awayScore: 0 },
    );
    expect(points).toBe(0);
  });

  it('awards 0 points for a múltipla with both the outcome and the score wrong', () => {
    const points = calculatePredictionPoints(
      { predictedOutcome: 'CASA', predictedHome: 2, predictedAway: 1 },
      { homeScore: 0, awayScore: 3 },
    );
    expect(points).toBe(0);
  });
});
