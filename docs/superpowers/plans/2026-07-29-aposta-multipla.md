# Aposta Múltipla Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace VZBet's single always-a-score prediction mechanic with two betting legs per match — simples (outcome only, 3/0 points) and múltipla (outcome + exact score, consistent with each other, all-or-nothing 7/0 points).

**Architecture:** Prisma schema gains a `PredictedOutcome` enum and makes `Prediction.predictedHome`/`predictedAway` nullable. `calculatePredictionPoints` is rewritten around the new guess shape. The submit use-case validates outcome/score consistency server-side (defense in depth); the frontend `MatchCard` never lets the two legs disagree in the first place by auto-deriving the outcome from a typed score.

**Tech Stack:** Same as the rest of the project — NestJS/Prisma 7/Jest on the backend, React/TanStack Query/Vitest on the frontend.

## Global Constraints

- Simples (outcome only) = 3 points if correct, 0 if wrong.
- Múltipla (outcome + exact score, must be consistent) = 7 points only if the exact score is correct (which necessarily also means the outcome is correct); 0 points if the score is wrong, even if the outcome the fan would have picked coincidentally matches the real result.
- The backend must reject (`ValidationError`) any submitted score whose derived outcome doesn't match the submitted `predictedOutcome`.
- No real production data exists yet — schema migrations may be destructive without a data-preservation plan.

---

### Task 1: Prisma schema migration

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Interfaces:**
- Produces: `PredictedOutcome` enum (`CASA`/`EMPATE`/`FORA`) and the updated `Prediction` model shape, consumed by every later task in this plan.

- [ ] **Step 1: Add the enum and update the Prediction model**

In `backend/prisma/schema.prisma`, add this enum next to the other enums (after `MatchStatus`):

```prisma
enum PredictedOutcome {
  CASA
  EMPATE
  FORA
}
```

Replace the `Prediction` model with:

```prisma
model Prediction {
  id               String           @id @default(uuid())
  userId           String
  user             User             @relation(fields: [userId], references: [id])
  matchId          String
  match            Match            @relation(fields: [matchId], references: [id])
  predictedOutcome PredictedOutcome
  predictedHome    Int?
  predictedAway    Int?
  pointsEarned     Int?
  createdAt        DateTime         @default(now())

  @@unique([userId, matchId])
}
```

- [ ] **Step 2: Run the migration**

Run (from `backend/`): `npx prisma migrate dev --name aposta_multipla`
Expected: migration created and applied, Prisma Client regenerated. The Prediction table is empty at this point (confirm with `npx prisma studio` if in doubt), so no data-loss prompt should appear.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add PredictedOutcome and make prediction score fields nullable"
```

*(Note: `npm run build`/`npm test` in `backend/` will show type errors in `prisma-prediction.repository.ts` until Task 3 — that's expected; this task only lands the DB shape.)*

---

### Task 2: Rewrite the scoring function

**Files:**
- Modify: `backend/src/predictions/domain/scoring.ts`
- Modify: `backend/src/predictions/domain/scoring.spec.ts`

**Interfaces:**
- Produces: `PredictedOutcome` type, `PredictionGuess { predictedOutcome, predictedHome: number | null, predictedAway: number | null }`, `calculatePredictionPoints(guess, result): number` — used by Task 5 (`RegisterMatchResultUseCase`).

- [ ] **Step 1: Write the failing tests**

`backend/src/predictions/domain/scoring.spec.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest predictions/domain/scoring.spec.ts`
Expected: FAIL — old `calculatePredictionPoints` signature doesn't accept `predictedOutcome`

- [ ] **Step 3: Write the implementation**

`backend/src/predictions/domain/scoring.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest predictions/domain/scoring.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/predictions/domain/scoring.ts backend/src/predictions/domain/scoring.spec.ts
git commit -m "feat: rewrite scoring for simples (3/0) and múltipla (7/0 all-or-nothing)"
```

---

### Task 3: Domain interface + Prisma repository update

**Files:**
- Modify: `backend/src/predictions/domain/prediction-repository.interface.ts`
- Modify: `backend/src/predictions/data/prisma-prediction.repository.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: updated `Prediction`, `SubmitPredictionData` shapes (both include `predictedOutcome: PredictedOutcome`, `predictedHome`/`predictedAway: number | null`) — consumed by Task 4 (use-case + DTO) and Task 5 (register-result use-case).

- [ ] **Step 1: Update the domain interface**

`backend/src/predictions/domain/prediction-repository.interface.ts`:
```ts
export type PredictedOutcome = 'CASA' | 'EMPATE' | 'FORA';

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  predictedOutcome: PredictedOutcome;
  predictedHome: number | null;
  predictedAway: number | null;
  pointsEarned: number | null;
}

export interface SubmitPredictionData {
  userId: string;
  matchId: string;
  predictedOutcome: PredictedOutcome;
  predictedHome: number | null;
  predictedAway: number | null;
}

export interface RankingEntry {
  userId: string;
  userName: string;
  totalPoints: number;
}

export interface PredictionRepository {
  upsert(data: SubmitPredictionData): Promise<Prediction>;
  findByMatchId(matchId: string): Promise<Prediction[]>;
  findByUserId(userId: string): Promise<Prediction[]>;
  registerResultAndScorePredictions(
    matchId: string,
    result: { homeScore: number; awayScore: number },
    scoredPredictions: { predictionId: string; points: number }[],
  ): Promise<void>;
  findScoredPredictions(championshipId?: string): Promise<{ userId: string; userName: string; points: number }[]>;
}

export const PREDICTION_REPOSITORY = Symbol('PREDICTION_REPOSITORY');
```

- [ ] **Step 2: Update the Prisma repository's upsert**

In `backend/src/predictions/data/prisma-prediction.repository.ts`, replace the `upsert` method:

```ts
  upsert(data: SubmitPredictionData): Promise<Prediction> {
    return this.prisma.prediction.upsert({
      where: { userId_matchId: { userId: data.userId, matchId: data.matchId } },
      update: {
        predictedOutcome: data.predictedOutcome,
        predictedHome: data.predictedHome,
        predictedAway: data.predictedAway,
      },
      create: data,
    });
  }
```

(The rest of the file — `findByMatchId`, `findByUserId`, `registerResultAndScorePredictions`, `findScoredPredictions` — is unchanged.)

- [ ] **Step 3: Verify the project still type-checks**

Run: `cd backend && npm run build`
Expected: SUCCESS (no type errors) — this task's changes align the interface with both the schema (Task 1) and the repository implementation.

- [ ] **Step 4: Commit**

```bash
git add backend/src/predictions/domain/prediction-repository.interface.ts backend/src/predictions/data/prisma-prediction.repository.ts
git commit -m "feat: update Prediction domain interface and repository for the new outcome field"
```

---

### Task 4: Submit prediction DTO, use-case, and controller

**Files:**
- Modify: `backend/src/predictions/presentation/dto/submit-prediction.dto.ts`
- Modify: `backend/src/predictions/use-cases/submit-prediction.use-case.ts`
- Modify: `backend/src/predictions/use-cases/submit-prediction.use-case.spec.ts`
- Modify: `backend/src/predictions/presentation/predictions.controller.ts`

**Interfaces:**
- Consumes: `Prediction`, `SubmitPredictionData` from Task 3.
- Produces: `SubmitPredictionUseCase.execute(data: SubmitPredictionData): Promise<Prediction>` — same signature as before, now validates consistency. Used unchanged by Task 8 (frontend) via the HTTP layer.

- [ ] **Step 1: Write the failing tests**

`backend/src/predictions/use-cases/submit-prediction.use-case.spec.ts`:
```ts
import { SubmitPredictionUseCase } from './submit-prediction.use-case';
import { PredictionRepository } from '../domain/prediction-repository.interface';
import { MatchRepository } from '../../matches/domain/match-repository.interface';
import { Clock } from '../../shared/domain/clock.interface';

describe('SubmitPredictionUseCase', () => {
  function makePredictionRepository(): jest.Mocked<PredictionRepository> {
    return {
      upsert: jest.fn(),
      findByMatchId: jest.fn(),
      findByUserId: jest.fn(),
      registerResultAndScorePredictions: jest.fn(),
      findScoredPredictions: jest.fn(),
    };
  }
  function makeMatchRepository(): jest.Mocked<MatchRepository> {
    return { create: jest.fn(), findAll: jest.fn(), findById: jest.fn(), updateStatus: jest.fn() };
  }
  function makeClock(fixedNow: Date): Clock {
    return { now: () => fixedNow };
  }
  const scheduledMatch = {
    id: 'm1', championshipId: 'c', homeTeamId: 'h', awayTeamId: 'a', round: 1,
    kickoffAt: new Date('2026-08-10T15:00:00Z'), homeScore: null, awayScore: null, status: 'AGENDADA' as const,
  };

  it('accepts a simple outcome-only prediction (no score)', async () => {
    const predictionRepository = makePredictionRepository();
    const matchRepository = makeMatchRepository();
    matchRepository.findById.mockResolvedValue(scheduledMatch);
    const created = {
      id: 'p1', userId: 'u1', matchId: 'm1',
      predictedOutcome: 'CASA' as const, predictedHome: null, predictedAway: null, pointsEarned: null,
    };
    predictionRepository.upsert.mockResolvedValue(created);
    const clock = makeClock(new Date('2026-08-10T14:00:00Z'));
    const useCase = new SubmitPredictionUseCase(predictionRepository, matchRepository, clock);

    const result = await useCase.execute({
      userId: 'u1', matchId: 'm1', predictedOutcome: 'CASA', predictedHome: null, predictedAway: null,
    });

    expect(result).toEqual(created);
  });

  it('accepts a múltipla prediction where the score is consistent with the chosen outcome', async () => {
    const predictionRepository = makePredictionRepository();
    const matchRepository = makeMatchRepository();
    matchRepository.findById.mockResolvedValue(scheduledMatch);
    const created = {
      id: 'p1', userId: 'u1', matchId: 'm1',
      predictedOutcome: 'CASA' as const, predictedHome: 2, predictedAway: 1, pointsEarned: null,
    };
    predictionRepository.upsert.mockResolvedValue(created);
    const clock = makeClock(new Date('2026-08-10T14:00:00Z'));
    const useCase = new SubmitPredictionUseCase(predictionRepository, matchRepository, clock);

    const result = await useCase.execute({
      userId: 'u1', matchId: 'm1', predictedOutcome: 'CASA', predictedHome: 2, predictedAway: 1,
    });

    expect(result).toEqual(created);
  });

  it('rejects a múltipla prediction whose score contradicts the chosen outcome', async () => {
    const predictionRepository = makePredictionRepository();
    const matchRepository = makeMatchRepository();
    matchRepository.findById.mockResolvedValue(scheduledMatch);
    const clock = makeClock(new Date('2026-08-10T14:00:00Z'));
    const useCase = new SubmitPredictionUseCase(predictionRepository, matchRepository, clock);

    await expect(
      useCase.execute({ userId: 'u1', matchId: 'm1', predictedOutcome: 'EMPATE', predictedHome: 2, predictedAway: 1 }),
    ).rejects.toThrow('predictedOutcome is inconsistent with the predicted score');
    expect(predictionRepository.upsert).not.toHaveBeenCalled();
  });

  it('rejects a prediction with only one of predictedHome/predictedAway set', async () => {
    const predictionRepository = makePredictionRepository();
    const matchRepository = makeMatchRepository();
    matchRepository.findById.mockResolvedValue(scheduledMatch);
    const clock = makeClock(new Date('2026-08-10T14:00:00Z'));
    const useCase = new SubmitPredictionUseCase(predictionRepository, matchRepository, clock);

    await expect(
      useCase.execute({ userId: 'u1', matchId: 'm1', predictedOutcome: 'CASA', predictedHome: 2, predictedAway: null }),
    ).rejects.toThrow('Both predictedHome and predictedAway must be provided together, or neither');
  });

  it('rejects a prediction submitted after kickoff', async () => {
    const predictionRepository = makePredictionRepository();
    const matchRepository = makeMatchRepository();
    matchRepository.findById.mockResolvedValue(scheduledMatch);
    const clock = makeClock(new Date('2026-08-10T15:30:00Z'));
    const useCase = new SubmitPredictionUseCase(predictionRepository, matchRepository, clock);

    await expect(
      useCase.execute({ userId: 'u1', matchId: 'm1', predictedOutcome: 'CASA', predictedHome: null, predictedAway: null }),
    ).rejects.toThrow('Prediction deadline has passed');
    expect(predictionRepository.upsert).not.toHaveBeenCalled();
  });

  it('rejects a prediction for a match that is not scheduled', async () => {
    const predictionRepository = makePredictionRepository();
    const matchRepository = makeMatchRepository();
    matchRepository.findById.mockResolvedValue({ ...scheduledMatch, status: 'CANCELADA' });
    const clock = makeClock(new Date('2026-08-10T14:00:00Z'));
    const useCase = new SubmitPredictionUseCase(predictionRepository, matchRepository, clock);

    await expect(
      useCase.execute({ userId: 'u1', matchId: 'm1', predictedOutcome: 'CASA', predictedHome: null, predictedAway: null }),
    ).rejects.toThrow('Predictions are closed for this match');
  });

  it('rejects a negative predicted score', async () => {
    const predictionRepository = makePredictionRepository();
    const matchRepository = makeMatchRepository();
    matchRepository.findById.mockResolvedValue(scheduledMatch);
    const clock = makeClock(new Date('2026-08-10T14:00:00Z'));
    const useCase = new SubmitPredictionUseCase(predictionRepository, matchRepository, clock);

    await expect(
      useCase.execute({ userId: 'u1', matchId: 'm1', predictedOutcome: 'FORA', predictedHome: -1, predictedAway: 1 }),
    ).rejects.toThrow('Predicted score cannot be negative');
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd backend && npx jest predictions/use-cases/submit-prediction.use-case.spec.ts`
Expected: FAIL — current use-case has no consistency validation and its `execute` signature doesn't accept `predictedOutcome`

- [ ] **Step 3: Write the DTO**

`backend/src/predictions/presentation/dto/submit-prediction.dto.ts`:
```ts
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum PredictedOutcomeInput {
  CASA = 'CASA',
  EMPATE = 'EMPATE',
  FORA = 'FORA',
}

export class SubmitPredictionDto {
  @IsString()
  matchId: string;

  @IsEnum(PredictedOutcomeInput)
  predictedOutcome: PredictedOutcomeInput;

  @IsOptional()
  @IsInt()
  @Min(0)
  predictedHome?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  predictedAway?: number;
}
```

- [ ] **Step 4: Write the use-case implementation**

`backend/src/predictions/use-cases/submit-prediction.use-case.ts`:
```ts
import { Prediction, PredictionRepository, SubmitPredictionData } from '../domain/prediction-repository.interface';
import { MatchRepository } from '../../matches/domain/match-repository.interface';
import { Clock } from '../../shared/domain/clock.interface';
import { NotFoundError, ValidationError } from '../../shared/domain/errors';

function outcomeOf(home: number, away: number): 'CASA' | 'EMPATE' | 'FORA' {
  if (home > away) return 'CASA';
  if (home < away) return 'FORA';
  return 'EMPATE';
}

export class SubmitPredictionUseCase {
  constructor(
    private readonly predictionRepository: PredictionRepository,
    private readonly matchRepository: MatchRepository,
    private readonly clock: Clock,
  ) {}

  async execute(data: SubmitPredictionData): Promise<Prediction> {
    const match = await this.matchRepository.findById(data.matchId);
    if (!match) {
      throw new NotFoundError('Match not found');
    }
    if (match.status !== 'AGENDADA') {
      throw new ValidationError('Predictions are closed for this match');
    }
    if (this.clock.now().getTime() >= match.kickoffAt.getTime()) {
      throw new ValidationError('Prediction deadline has passed');
    }

    const hasHome = data.predictedHome !== null && data.predictedHome !== undefined;
    const hasAway = data.predictedAway !== null && data.predictedAway !== undefined;
    if (hasHome !== hasAway) {
      throw new ValidationError('Both predictedHome and predictedAway must be provided together, or neither');
    }

    if (hasHome && hasAway) {
      if (data.predictedHome! < 0 || data.predictedAway! < 0) {
        throw new ValidationError('Predicted score cannot be negative');
      }
      const derivedOutcome = outcomeOf(data.predictedHome!, data.predictedAway!);
      if (derivedOutcome !== data.predictedOutcome) {
        throw new ValidationError('predictedOutcome is inconsistent with the predicted score');
      }
    }

    return this.predictionRepository.upsert(data);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest predictions/use-cases/submit-prediction.use-case.spec.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Update the controller to normalize the DTO into the use-case's data shape**

In `backend/src/predictions/presentation/predictions.controller.ts`, replace the `submit` method body:

```ts
  @Post('predictions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TORCEDOR')
  submit(@Req() req: any, @Body() dto: SubmitPredictionDto) {
    const useCase = new SubmitPredictionUseCase(this.predictionRepository, this.matchRepository, new SystemClock());
    return useCase.execute({
      userId: req.user.userId,
      matchId: dto.matchId,
      predictedOutcome: dto.predictedOutcome,
      predictedHome: dto.predictedHome ?? null,
      predictedAway: dto.predictedAway ?? null,
    });
  }
```

(No other method in this controller changes.)

- [ ] **Step 7: Run the full backend test suite**

Run: `cd backend && npm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add backend/src/predictions/presentation/dto/submit-prediction.dto.ts backend/src/predictions/use-cases/submit-prediction.use-case.ts backend/src/predictions/use-cases/submit-prediction.use-case.spec.ts backend/src/predictions/presentation/predictions.controller.ts
git commit -m "feat: validate outcome/score consistency when submitting a prediction"
```

---

### Task 5: Register match result use-case

**Files:**
- Modify: `backend/src/predictions/use-cases/register-match-result.use-case.ts`
- Modify: `backend/src/predictions/use-cases/register-match-result.use-case.spec.ts`

**Interfaces:**
- Consumes: `calculatePredictionPoints` from Task 2, `Prediction` from Task 3.
- Produces: no signature change — `RegisterMatchResultUseCase.execute(data): Promise<void>`, unchanged externally.

- [ ] **Step 1: Update the test fixtures and expectations**

Replace the first test in `backend/src/predictions/use-cases/register-match-result.use-case.spec.ts`:

```ts
  it('registers the result and scores every prediction for the match', async () => {
    const predictionRepository = makePredictionRepository();
    const matchRepository = makeMatchRepository();
    matchRepository.findById.mockResolvedValue(scheduledMatch);
    predictionRepository.findByMatchId.mockResolvedValue([
      { id: 'p1', userId: 'u1', matchId: 'm1', predictedOutcome: 'CASA', predictedHome: 2, predictedAway: 1, pointsEarned: null },
      { id: 'p2', userId: 'u2', matchId: 'm1', predictedOutcome: 'EMPATE', predictedHome: null, predictedAway: null, pointsEarned: null },
    ]);
    const useCase = new RegisterMatchResultUseCase(matchRepository, predictionRepository);

    await useCase.execute({ matchId: 'm1', homeScore: 2, awayScore: 1 });

    expect(predictionRepository.registerResultAndScorePredictions).toHaveBeenCalledTimes(1);
    expect(predictionRepository.registerResultAndScorePredictions).toHaveBeenCalledWith(
      'm1',
      { homeScore: 2, awayScore: 1 },
      [
        { predictionId: 'p1', points: 7 },
        { predictionId: 'p2', points: 0 },
      ],
    );
  });
```

(The other two tests — "already registered" and "cancelled" — don't touch prediction data and are unchanged.)

- [ ] **Step 2: Run tests to verify the updated one fails**

Run: `cd backend && npx jest predictions/use-cases/register-match-result.use-case.spec.ts`
Expected: FAIL — `calculatePredictionPoints` is still called with the old `{ predictedHome, predictedAway }` shape, missing `predictedOutcome`

- [ ] **Step 3: Update the implementation**

In `backend/src/predictions/use-cases/register-match-result.use-case.ts`, replace the `scoredPredictions` mapping inside `execute`:

```ts
    const predictions = await this.predictionRepository.findByMatchId(data.matchId);
    const scoredPredictions = predictions.map((prediction) => ({
      predictionId: prediction.id,
      points: calculatePredictionPoints(
        {
          predictedOutcome: prediction.predictedOutcome,
          predictedHome: prediction.predictedHome,
          predictedAway: prediction.predictedAway,
        },
        { homeScore: data.homeScore, awayScore: data.awayScore },
      ),
    }));
```

(Everything else in the file is unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest predictions/use-cases/register-match-result.use-case.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full backend test suite**

Run: `cd backend && npm test`
Expected: PASS (all suites)

- [ ] **Step 6: Commit**

```bash
git add backend/src/predictions/use-cases/register-match-result.use-case.ts backend/src/predictions/use-cases/register-match-result.use-case.spec.ts
git commit -m "feat: score múltipla and simples predictions on match-result registration"
```

---

### Task 6: Frontend types and predictions API

**Files:**
- Modify: `frontend/src/types/api.ts`
- Modify: `frontend/src/api/predictions.ts`
- Modify: `frontend/src/api/predictions.test.ts`

**Interfaces:**
- Produces: `PredictedOutcome` type, updated `Prediction`/`SubmitPredictionPayload` — consumed by Task 7 (`MatchCard`) and Task 8 (`MatchesPage`).

- [ ] **Step 1: Update the shared types**

In `frontend/src/types/api.ts`, add and replace:

```ts
export type PredictedOutcome = 'CASA' | 'EMPATE' | 'FORA'

export interface Prediction {
  id: string
  matchId: string
  predictedOutcome: PredictedOutcome
  predictedHome: number | null
  predictedAway: number | null
  pointsEarned: number | null
}

export interface SubmitPredictionPayload {
  matchId: string
  predictedOutcome: PredictedOutcome
  predictedHome: number | null
  predictedAway: number | null
}
```

(These replace the old `Prediction`/`SubmitPredictionPayload` interfaces in that file. Everything else in `types/api.ts` is unchanged.)

- [ ] **Step 2: Write the failing test**

Replace the second test in `frontend/src/api/predictions.test.ts`:

```ts
  it('posts to /predictions with the prediction payload', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({
      id: '1',
      matchId: 'match-1',
      predictedOutcome: 'CASA',
      predictedHome: 2,
      predictedAway: 1,
      pointsEarned: null,
    })
    const payload = { matchId: 'match-1', predictedOutcome: 'CASA' as const, predictedHome: 2, predictedAway: 1 }

    await submitPrediction(payload)

    expect(spy).toHaveBeenCalledWith('/predictions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })
```

- [ ] **Step 3: Run test to verify it still passes structurally, then confirm the type change compiles**

Run: `cd frontend && npm test -- predictions.test.ts`
Expected: PASS (the function body of `submitPrediction` doesn't change, only the types — this step exists to catch any type mismatch before moving to the components that depend on it)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/api.ts frontend/src/api/predictions.test.ts
git commit -m "feat: update frontend prediction types for simples/múltipla"
```

---

### Task 7: MatchCard rework

**Files:**
- Modify: `frontend/src/features/matches/MatchCard.tsx`
- Modify: `frontend/src/features/matches/MatchCard.test.tsx`

**Interfaces:**
- Consumes: `PredictedOutcome`, `Prediction` from Task 6.
- Produces: `MatchCard`'s `onSubmit` prop signature changes to
  `(predictedOutcome: PredictedOutcome, predictedHome: number | null, predictedAway: number | null) => void` —
  consumed by Task 8 (`MatchesPage`).

- [ ] **Step 1: Write the failing tests**

`frontend/src/features/matches/MatchCard.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Match } from '../../types/api'
import { MatchCard } from './MatchCard'

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    championshipId: 'champ-1',
    homeTeamId: 'team-1',
    awayTeamId: 'team-2',
    round: 1,
    kickoffAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    homeScore: null,
    awayScore: null,
    status: 'AGENDADA',
    ...overrides,
  }
}

describe('MatchCard', () => {
  it('submits a simple outcome-only prediction', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <MatchCard
        match={buildMatch()}
        homeTeamName="Leões"
        awayTeamName="Tigres"
        existingPrediction={undefined}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    )

    await user.click(screen.getByText('Casa vence'))
    await user.click(screen.getByText('Enviar palpite'))

    expect(onSubmit).toHaveBeenCalledWith('CASA', null, null)
  })

  it('locks the outcome buttons to match the typed score and submits a múltipla', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <MatchCard
        match={buildMatch()}
        homeTeamName="Leões"
        awayTeamName="Tigres"
        existingPrediction={undefined}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    )

    await user.click(screen.getByText(/arriscar o placar exato/))
    await user.clear(screen.getByLabelText('Placar de Leões'))
    await user.type(screen.getByLabelText('Placar de Leões'), '2')
    await user.clear(screen.getByLabelText('Placar de Tigres'))
    await user.type(screen.getByLabelText('Placar de Tigres'), '1')

    expect(screen.getByText('Casa vence')).toBeDisabled()
    expect(screen.getByText('Empate')).toBeDisabled()

    await user.click(screen.getByText('Enviar palpite'))

    expect(onSubmit).toHaveBeenCalledWith('CASA', 2, 1)
  })

  it('disables everything once the kickoff deadline has passed', () => {
    render(
      <MatchCard
        match={buildMatch({ kickoffAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() })}
        homeTeamName="Leões"
        awayTeamName="Tigres"
        existingPrediction={undefined}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    )

    expect(screen.getByText('Casa vence')).toBeDisabled()
    expect(screen.getByText('Prazo encerrado')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- MatchCard.test.tsx`
Expected: FAIL — `MatchCard` doesn't yet render "Casa vence"/"Empate"/"Fora vence" buttons or the múltipla toggle

- [ ] **Step 3: Write the implementation**

`frontend/src/features/matches/MatchCard.tsx`:
```tsx
import { useState } from 'react'
import type { Match, PredictedOutcome, Prediction } from '../../types/api'

interface MatchCardProps {
  match: Match
  homeTeamName: string
  awayTeamName: string
  existingPrediction: Prediction | undefined
  onSubmit: (predictedOutcome: PredictedOutcome, predictedHome: number | null, predictedAway: number | null) => void
  isSubmitting: boolean
}

function outcomeFromScore(home: number, away: number): PredictedOutcome {
  if (home > away) return 'CASA'
  if (home < away) return 'FORA'
  return 'EMPATE'
}

export function MatchCard({
  match,
  homeTeamName,
  awayTeamName,
  existingPrediction,
  onSubmit,
  isSubmitting,
}: MatchCardProps) {
  const [outcome, setOutcome] = useState<PredictedOutcome | null>(existingPrediction?.predictedOutcome ?? null)
  const [showScore, setShowScore] = useState(
    existingPrediction?.predictedHome !== null && existingPrediction?.predictedHome !== undefined,
  )
  const [predictedHome, setPredictedHome] = useState(existingPrediction?.predictedHome ?? 0)
  const [predictedAway, setPredictedAway] = useState(existingPrediction?.predictedAway ?? 0)
  const deadlinePassed = new Date(match.kickoffAt).getTime() <= Date.now()

  function handleScoreChange(home: number, away: number) {
    setPredictedHome(home)
    setPredictedAway(away)
    setOutcome(outcomeFromScore(home, away))
  }

  function handleSubmit() {
    if (outcome === null) return
    onSubmit(outcome, showScore ? predictedHome : null, showScore ? predictedAway : null)
  }

  return (
    <li className="rounded-lg border border-brand-blue/20 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{new Date(match.kickoffAt).toLocaleString('pt-BR')}</span>
        {deadlinePassed && <span className="font-semibold text-red-600">Prazo encerrado</span>}
      </div>
      <div className="mt-2 flex items-center justify-center gap-2 text-sm font-medium text-brand-blue-dark">
        <span>{homeTeamName}</span>
        <span className="text-slate-400">x</span>
        <span>{awayTeamName}</span>
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          disabled={deadlinePassed || showScore}
          onClick={() => setOutcome('CASA')}
          className={`rounded px-3 py-1.5 text-sm ${
            outcome === 'CASA' ? 'bg-brand-blue text-white' : 'border border-brand-blue/40 text-brand-blue-dark'
          } disabled:opacity-50`}
        >
          Casa vence
        </button>
        <button
          type="button"
          disabled={deadlinePassed || showScore}
          onClick={() => setOutcome('EMPATE')}
          className={`rounded px-3 py-1.5 text-sm ${
            outcome === 'EMPATE' ? 'bg-brand-blue text-white' : 'border border-brand-blue/40 text-brand-blue-dark'
          } disabled:opacity-50`}
        >
          Empate
        </button>
        <button
          type="button"
          disabled={deadlinePassed || showScore}
          onClick={() => setOutcome('FORA')}
          className={`rounded px-3 py-1.5 text-sm ${
            outcome === 'FORA' ? 'bg-brand-blue text-white' : 'border border-brand-blue/40 text-brand-blue-dark'
          } disabled:opacity-50`}
        >
          Fora vence
        </button>
      </div>
      {!deadlinePassed && (
        <button
          type="button"
          onClick={() => setShowScore((current) => !current)}
          className="mt-2 block w-full text-center text-xs text-brand-blue underline"
        >
          {showScore ? 'Cancelar múltipla' : 'Quer arriscar o placar exato? (múltipla, vale mais)'}
        </button>
      )}
      {showScore && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <input
            aria-label={`Placar de ${homeTeamName}`}
            type="number"
            min={0}
            value={predictedHome}
            disabled={deadlinePassed}
            onChange={(event) => handleScoreChange(Number(event.target.value), predictedAway)}
            className="w-14 rounded border border-slate-300 text-center"
          />
          <span>x</span>
          <input
            aria-label={`Placar de ${awayTeamName}`}
            type="number"
            min={0}
            value={predictedAway}
            disabled={deadlinePassed}
            onChange={(event) => handleScoreChange(predictedHome, Number(event.target.value))}
            className="w-14 rounded border border-slate-300 text-center"
          />
        </div>
      )}
      <p className="mt-2 text-center text-xs text-slate-400">Simples: 3 pts · Múltipla: 7 pts (tudo ou nada)</p>
      <button
        type="button"
        disabled={deadlinePassed || isSubmitting || outcome === null}
        onClick={handleSubmit}
        className="mt-2 w-full rounded bg-brand-blue py-1.5 text-white disabled:opacity-50"
      >
        {existingPrediction ? 'Atualizar palpite' : 'Enviar palpite'}
      </button>
    </li>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- MatchCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/matches/MatchCard.tsx frontend/src/features/matches/MatchCard.test.tsx
git commit -m "feat: rework MatchCard for simples/múltipla betting"
```

---

### Task 8: MatchesPage wiring

**Files:**
- Modify: `frontend/src/features/matches/MatchesPage.tsx`
- Modify: `frontend/src/features/matches/MatchesPage.test.tsx`

**Interfaces:**
- Consumes: `MatchCard`'s new `onSubmit` signature from Task 7, `SubmitPredictionPayload` from Task 6.
- Produces: this is the final integration point for this plan — no later task depends on it.

- [ ] **Step 1: Write the failing test**

Add this test to `frontend/src/features/matches/MatchesPage.test.tsx` (keep the existing "joins team names" test as-is; add this new one, and add `import userEvent from '@testing-library/user-event'` to the top of the file alongside the existing imports):

```tsx
  it('submits the outcome and score through to the predictions API when a card is submitted', async () => {
    const user = userEvent.setup()
    vi.spyOn(teamsApi, 'listTeams').mockResolvedValue([
      { id: 'team-1', name: 'Leões' },
      { id: 'team-2', name: 'Tigres' },
    ])
    vi.spyOn(matchesApi, 'listMatches').mockResolvedValue([
      {
        id: 'match-1',
        championshipId: 'champ-1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        round: 1,
        kickoffAt: new Date(Date.now() + 3600_000).toISOString(),
        homeScore: null,
        awayScore: null,
        status: 'AGENDADA',
      },
    ])
    vi.spyOn(predictionsApi, 'listMyPredictions').mockResolvedValue([])
    const submitSpy = vi.spyOn(predictionsApi, 'submitPrediction').mockResolvedValue({
      id: 'p1',
      matchId: 'match-1',
      predictedOutcome: 'CASA',
      predictedHome: null,
      predictedAway: null,
      pointsEarned: null,
    })

    renderWithClient(<MatchesPage />)

    await waitFor(() => screen.getByText('Casa vence'))
    await user.click(screen.getByText('Casa vence'))
    await user.click(screen.getByText('Enviar palpite'))

    expect(submitSpy).toHaveBeenCalledWith({
      matchId: 'match-1',
      predictedOutcome: 'CASA',
      predictedHome: null,
      predictedAway: null,
    })
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- MatchesPage.test.tsx`
Expected: FAIL — `MatchesPage`'s `onSubmit` still calls `submitMutation.mutate` with the old `{ matchId, predictedHome, predictedAway }` shape

- [ ] **Step 3: Update the implementation**

In `frontend/src/features/matches/MatchesPage.tsx`, replace the `onSubmit` prop passed to `MatchCard`:

```tsx
          onSubmit={(predictedOutcome, predictedHome, predictedAway) =>
            submitMutation.mutate({ matchId: match.id, predictedOutcome, predictedHome, predictedAway })
          }
```

(Nothing else in the file changes.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- MatchesPage.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS (all suites)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/matches/MatchesPage.tsx frontend/src/features/matches/MatchesPage.test.tsx
git commit -m "feat: wire the new simples/múltipla payload through MatchesPage"
```

---

## Self-Review Notes

- **Spec coverage:** schema change (Task 1), scoring rewrite with the critical "right outcome, wrong score in a múltipla pays 0" case explicitly tested (Task 2), consistency validation (Task 4), result-registration scoring (Task 5), and the full frontend UI rework with auto-derived, always-consistent outcome selection (Tasks 6-8) — all sections of the spec are covered.
- **Placeholder scan:** none found; every step has runnable code.
- **Type consistency:** `predictedOutcome`/`predictedHome`/`predictedAway` names and the `PredictedOutcome` enum values (`CASA`/`EMPATE`/`FORA`) are identical across backend domain, DTO, repository, and frontend types/component — checked task-by-task.
