# Changelog

Full history of implemented work on the backend, in reverse-chronological order (newest first).
See `README.md` for a short project overview and links to the rest of the docs.

---

> <time datetime="2026-07-29">2026-07-29</time>
>
> **Rebrand to VZBet + architecture map linked from the README:**
> - Renamed the project from its working title "Várzea Palpites" to **VZBet** — the GitHub repo
>   renamed from `varzea-palpites` to `vzbet` (git remote updated to match), the local folder
>   renamed to `C:\dev\vzbet`, and the local Docker container renamed from `varzea-db` to
>   `vzbet-db`. The Postgres database name inside the container stays `varzea_palpites` internally
>   — never user-facing, not worth the risk of touching a working local setup for a cosmetic rename.
> - Visual identity locked in as blue and white, no green anywhere in any visual asset; red is
>   reserved strictly for genuine semantic danger/warning callouts (e.g. legal risk), never used as
>   brand decoration.
> - README updated to link the already-published interactive architecture-map artifact near the
>   top, so a reader sees the visual overview before the prose.
> - Everything before this point in this file — commit messages, the original design spec — still
>   says "Várzea Palpites." That's correct and intentionally left alone: it's a dated historical
>   record, not something to retroactively rename.

---

> **Post-review follow-up: dead result-registration code removed, status filter hardened, ranking made deterministic:**
> - Deleted the old `MatchRepository.registerResult()` and `PredictionRepository.updatePoints()` —
>   the non-atomic pair of methods the transactional `registerResultAndScorePredictions()` (added in
>   "Wave B" below) had already fully replaced. They had zero remaining callers, but leaving them in
>   place meant a future contributor could reach for them and reopen the exact race condition just
>   fixed.
> - `GET /matches?status=` previously let an invalid value (e.g. `?status=FOO`) reach Prisma
>   unfiltered, surfacing as an unhandled 500 via a raw `PrismaClientValidationError` instead of one
>   of the four typed domain errors the global filter catches. Added validation so a bad status value
>   now fails cleanly.
> - Refined `GetRankingUseCase`: narrowed the ranking query to the fields the aggregation actually
>   needs, ordered scored predictions deterministically before summing, and pinned the equal-points
>   tie-break's `localeCompare` call explicitly to the `'pt-BR'` locale rather than relying on the
>   runtime's default.
> - By this point the suite stands at 12 suites / 32 tests passing — unit tests over mocked
>   repositories, which is the project's real test strategy (the legacy e2e smoke test remains only
>   partially fixed; see "Wave A" below).

---

> **"Wave B": the four substantial fixes from the final review, each verified against a live server + real Postgres:**
> - `RegisterMatchResultUseCase` was non-atomic — it wrote the match result, then looped a separate
>   `updatePoints()` call per prediction. A crash or DB error partway through could leave the match
>   `FINALIZADA` with only some predictions scored, and the `FINALIZADA` guard would then permanently
>   block any retry. Fixed with a new repository method,
>   `registerResultAndScorePredictions(matchId, result, scoredPredictions)`, built on Prisma's
>   array-form `$transaction` — the match update and every prediction's point update now commit
>   atomically, in one database transaction.
> - Ranking aggregation used to live directly inside `PrismaPredictionRepository.getRanking()` —
>   untestable without a live database, and missing the spec's own requirement of a per-championship
>   ranking option. Moved into a new `GetRankingUseCase`, now a pure, unit-tested function over raw
>   scored-prediction rows, with an added `championshipId` filter and an alphabetical tie-break for
>   equal points.
> - Fans could submit and edit predictions but never read them back. Added `GET /predictions/me`,
>   scoped to the authenticated user's own id only.
> - `GET /matches` returned every match unconditionally, with no way to fetch one team's match
>   history. Added optional `teamId` (matches either home or away), `championshipId`, and `status`
>   query filters.

---

> **Final review — "Wave A": deploy config, security, domain errors, DTO validation:**
> - `npm run start:prod` pointed at `dist/main`, but the actual compiled entry sits at
>   `dist/src/main` — because `prisma.config.ts` lives at the backend root, outside `src/`, which
>   widens TypeScript's inferred `rootDir`. Would have been a hard deploy blocker on Render.
> - Closed a silent security fallback: if `JWT_SECRET` was unset, the app previously booted anyway
>   using a hardcoded default (`'dev-only-change-me'`) — sitting in the repo's own git history. A
>   misconfigured production deploy would have silently signed tokens with a secret anyone could
>   read, letting an attacker forge an ADMIN token. Added a `getRequiredEnv()` helper that now throws
>   at boot if the variable is missing.
> - Fixed a real spec violation: a cancelled match could still be finalized and have its predictions
>   scored, because the check only tested `status === 'FINALIZADA'` rather than rejecting any
>   non-`AGENDADA` status.
> - Added CORS configuration — previously entirely absent, which would have blocked the
>   not-yet-built frontend from calling the API at all once it exists on a different origin.
> - The `auth` module, built earliest, had hand-rolled its own try/catch → `ConflictException` /
>   `UnauthorizedException` translation with fragile string-matching on error messages. Rewired to
>   use the same `ConflictError`/`UnauthorizedError` domain-error pattern every other module already
>   followed.
> - Required string DTO fields (team name, player name/position, championship name/season) accepted
>   empty strings — added the missing `@IsNotEmpty()` validators.
> - Also made a start on the long-broken `backend/test/app.e2e-spec.ts` (the default
>   NestJS-CLI-generated smoke test, broken because ts-jest couldn't resolve the Prisma-generated
>   client's ESM-style imports): added a `moduleNameMapper` config and a `setupFiles` dotenv loader.
>   Not fully resolved — remains a tracked, open follow-up; the project's real coverage comes from
>   unit tests with mocked repositories, not this one legacy test.

---

> **Initial documentation set + global request validation enabled:**
> - Added `README.md`, `docs/use-cases.md`, and a mermaid `docs/er-diagram.md` (Portuguese labels on
>   relationships, English field names).
> - Enabled a global `class-validator` `ValidationPipe`, so malformed requests are rejected before
>   they ever reach a controller.
> - Committed the original brainstorm/design spec into the repo
>   (`docs/superpowers/specs/2026-07-28-var-apostas-varzea-design.md`) so the README's link to it
>   actually resolves — a historical record of the pre-build regulatory reasoning and MVP scope
>   decisions, written before the project's name became VZBet (still says "Várzea Palpites"
>   throughout, which is correct and intentionally left alone).

---

> **Predictions module — the core feature: scoring rule + ranking:**
> - New pure function `calculatePredictionPoints(guess, result)` in
>   `backend/src/predictions/domain/scoring.ts`: an exact score match earns **3 points**, a correct
>   outcome (home win / away win / draw) with the wrong exact score earns **1 point**, a wrong
>   outcome earns **0 points**. The exact-score check runs before the outcome-comparison fallback.
>   Zero framework or database dependency, fully unit-testable in isolation.
> - `SubmitPredictionUseCase` checks, in order: the match exists, its status is `AGENDADA`, the
>   deadline (via an injected `Clock`) hasn't passed, and the score isn't negative — then upserts, so
>   a fan can keep editing a prediction right up until kickoff.
> - `RegisterMatchResultUseCase` validates not-found / already-registered / cancelled / negative-score,
>   then writes the match result and scores every prediction (this version is non-atomic — the bug
>   that gets fixed in "Wave B" below).
> - `Prediction` carries a `@@unique([userId, matchId])` constraint — one prediction per fan per
>   match.

---

> **Matches module — schedule, list, cancel:**
> - `ScheduleMatchUseCase` checks, cheapest-first: rejects a match between a team and itself, then
>   confirms the championship exists, then the home team, then the away team.
> - `CancelMatchUseCase` blocks cancelling a match that's already `FINALIZADA`.
> - `ListMatchesUseCase` lists all matches (the `teamId`/`championshipId`/`status` filters were
>   added later, in "Wave B").
> - `MatchStatus` enum: `AGENDADA | FINALIZADA | CANCELADA`. `Match` has two distinct relations to
>   `Team` (home and away), modeled in Prisma as `@relation("HomeTeam")` / `@relation("AwayTeam")`.

---

> **Championships module:**
> - `CreateChampionshipUseCase` validates `endDate > startDate`, throwing a `ValidationError`
>   otherwise.
> - `ListChampionshipsUseCase` lists all championships.
> - Format modeled as an enum, `ChampionshipFormat`: `PONTOS_CORRIDOS | MATA_MATA`.

---

> **Players module, scoped to a team:**
> - `AddPlayerUseCase` confirms the parent team exists first (via the injected `TeamRepository`),
>   throwing `NotFoundError` before ever creating the player.
> - `ListPlayersByTeamUseCase` lists a team's roster.
> - Nested route: `POST /teams/:teamId/players`.

---

> <time datetime="2026-07-28">2026-07-28</time>
>
> **Teams module + a global domain error filter (found via code review):**
> - New `teams` module: `CreateTeamUseCase` (rejects a blank/whitespace-only name via a
>   `ValidationError`), `ListTeamsUseCase`, `GetTeamUseCase` (throws `NotFoundError` for an unknown
>   id). Exports a `TEAM_REPOSITORY` token so the players and matches modules can confirm a team
>   exists.
> - Reviewing this module surfaced a real, structural bug: every use case up to this point threw a
>   plain `Error` for expected business failures like "team not found," which NestJS turns into a
>   generic, misleading `500` by default instead of a proper `404`/`400`.
> - Fixed by introducing a new `shared/` module with `NotFoundError` and `ValidationError`
>   (`ConflictError` and `UnauthorizedError` followed later, in "Wave A"), plus a global
>   `DomainErrorFilter` (`@Catch(...)`, registered via `app.useGlobalFilters(...)`) that maps each
>   error class to its correct HTTP status automatically — no per-controller try/catch needed. Every
>   module built from this point on uses the pattern from day one.

---

> **Auth module wired up with JWT + role guards, then a duplicate-registration bug fixed:**
> - JWT strategy, `JwtAuthGuard`, and a `RolesGuard`/`@Roles()` decorator — reused by every other
>   module's controllers to gate `ADMIN`-only routes.
> - Immediately after wiring this up, found that a duplicate-registration attempt returned a bare,
>   unhandled 500 instead of a clean 409 — `AuthController.register()` had no try/catch around a use
>   case that could throw "email already registered." Restored the app's root route in the same pass.
> - A follow-up fix narrowed that catch to the actual duplicate-email case specifically (rather than
>   swallowing anything), added logging via NestJS's `Logger` for anything unexpected, and re-throws
>   unhandled errors so they still surface as real 500s instead of being silently mislabeled.
> - Known, deliberately lower-priority gap left open at this point: `login()` in `AuthController`
>   still has a broader catch-all than `register()`'s narrowed one — the same class of issue,
>   intentionally not touched in this fix round to keep it minimally scoped.

---

> **LoginUserUseCase, then a timing side-channel closed:**
> - `LoginUserUseCase` added first.
> - Found and fixed a real timing attack the same session: an unknown email originally returned
>   immediately with no `bcrypt` call, while a wrong password ran a real, slow `bcrypt.compare()` —
>   meaning an attacker could distinguish "no such account" from "wrong password" purely by measuring
>   response latency, even though both paths threw the identical `"Invalid credentials"` message.
>   Fixed by always calling `bcrypt.compare()`, using a fixed dummy hash when the user isn't found,
>   so both failure paths take comparable time.

---

> **RegisterUserUseCase + a Clock abstraction for testable deadlines:**
> - `RegisterUserUseCase` always assigns the `TORCEDOR` role and hashes the password with
>   `bcrypt.hash(password, 10)` — its input type has no `role` field at all, so there's no code path
>   anywhere to smuggle in `ADMIN` at signup. `ADMIN` accounts are only ever promoted by hand,
>   directly in the database.
> - New `Clock` interface (`now(): Date`) plus a `SystemClock` implementation, added ahead of the
>   predictions module's deadline logic so kickoff-deadline checks can later be unit-tested with a
>   fake clock instead of real wall time.

---

> **Prisma 7 turned out to be a moving target — global PrismaService, and the surprises that came with it:**
> - Building the global `PrismaService`/`PrismaModule` surfaced that the installed Prisma version
>   (7.9.1) removed the classic `prisma-client-js` generator: the schema now needs
>   `generator client { provider = "prisma-client", output = "../generated/prisma", moduleFormat =
>   "cjs" }`, with `output` now mandatory and `moduleFormat = "cjs"` required — without it, NestJS
>   throws `ReferenceError: exports is not defined in ES module scope` at runtime, because Prisma 7
>   defaults to ESM output while Nest compiles to CommonJS.
> - The runtime client also now needs an explicit driver adapter rather than a bare
>   `new PrismaClient()`: `PrismaService` constructs `new PrismaPg({ connectionString:
>   process.env.DATABASE_URL })` and passes it as `{ adapter }` to `super()`, pulling in
>   `@prisma/adapter-pg` and `pg` (plus `@types/pg` as a dev dependency).
> - `DATABASE_URL` no longer lives in `schema.prisma` at all — an implementer accidentally
>   reintroduced the now-deprecated `datasource.url` line while working through this, caught in code
>   review and reverted. The URL lives only in `backend/prisma.config.ts`, used by the Prisma CLI
>   (migrate/generate/studio).
> - The app's own runtime never loaded `.env` by default (only `prisma.config.ts` did, for the CLI)
>   — fixed by adding `import 'dotenv/config';` as the first line of `backend/src/main.ts`, and
>   promoting `dotenv` from a dev dependency to a regular one since runtime code now uses it.
> - Also fixed connection-pool disposal along the way. The generated client is imported from
>   `'../../generated/prisma/client'` in `prisma.service.ts` — never `'@prisma/client'`.

---

> **Bootstrap: NestJS backend + initial Prisma schema:**
> - Bootstrapped the NestJS backend with Prisma as the ORM — required for this project (unlike some
>   others that can run with no database at all), since VZBet's whole point is persisted
>   teams/matches/predictions.
> - Defined the initial Prisma schema for teams, matches, and predictions, targeting PostgreSQL 16
>   (Docker locally).
