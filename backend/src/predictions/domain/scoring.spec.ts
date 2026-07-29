import { calculatePredictionPoints } from './scoring';

describe('calculatePredictionPoints', () => {
  it('awards 3 points for an exact score match', () => {
    const points = calculatePredictionPoints({ predictedHome: 2, predictedAway: 1 }, { homeScore: 2, awayScore: 1 });
    expect(points).toBe(3);
  });

  it('awards 1 point for a correctly predicted home win with the wrong score', () => {
    const points = calculatePredictionPoints({ predictedHome: 3, predictedAway: 1 }, { homeScore: 2, awayScore: 0 });
    expect(points).toBe(1);
  });

  it('awards 1 point for a correctly predicted draw with the wrong score', () => {
    const points = calculatePredictionPoints({ predictedHome: 1, predictedAway: 1 }, { homeScore: 0, awayScore: 0 });
    expect(points).toBe(1);
  });

  it('awards 0 points for a wrong outcome', () => {
    const points = calculatePredictionPoints({ predictedHome: 1, predictedAway: 0 }, { homeScore: 0, awayScore: 2 });
    expect(points).toBe(0);
  });
});
