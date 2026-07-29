# Coding Standards

All source code, identifiers, and comments are written in **English**, regardless of the spoken
language used in commit discussions or project planning. Principles below are summarized in our
own words from Robert C. Martin's *Clean Code* and *Clean Architecture*; no text is reproduced from
either book.

## Naming and functions

- Names say what something is or does; no abbreviations that need a mental decoder ring
  (`calculatePredictionPoints`, not `calcPts`).
- A function does one thing, at one level of abstraction. If describing it needs "and", split it.
- Prefer small, composable functions over long ones with internal section comments — the section
  comment is a signal the function should be split.

## Comments

- Code should read clearly enough that most lines need no comment.
- Write a comment only when it captures something the code itself can't: a non-obvious constraint,
  the reason for an unusual workaround, or a warning about a subtle edge case. For example, the
  login flow always runs a real `bcrypt.compare()` — even against a dummy hash when no user is
  found — specifically to keep response timing constant and avoid leaking account existence; that
  reasoning belongs in a comment because the code alone doesn't explain *why* the "wasted" bcrypt
  call is there.
- Never leave a comment describing *what* the next line does if the line already says so.

## Architecture (Clean Architecture layering)

The backend follows Clean Architecture's dependency rule: **inner layers never depend on outer
layers.** Every feature module (`auth`, `teams`, `players`, `championships`, `matches`,
`predictions`) follows the same 4-folder shape:

```
backend/src/<module>/
  domain/         # Pure TypeScript types + repository interfaces. Zero NestJS/Prisma imports.
  use-cases/      # Plain TS classes, one per business action. Unit-tested with mocked repositories.
  data/           # Prisma<X>Repository implementations. Only these files import PrismaService.
  presentation/   # NestJS controllers, DTOs, guards. Wires a use-case to an HTTP route.
```

Plus a `shared/` module for cross-cutting concerns that don't belong to any single feature:

```
backend/src/shared/
  domain/errors.ts              # NotFoundError, ValidationError, ConflictError, UnauthorizedError
  domain/clock.interface.ts     # Clock interface (now() -> Date), for testable deadline logic
  data/system-clock.ts          # SystemClock implements Clock
  presentation/domain-error.filter.ts  # Global NestJS exception filter mapping the 4 error
                                        # classes above to 404/400/409/401 automatically
```

Concretely:

- Domain code has zero imports from NestJS, Prisma, or any specific database driver — it can be
  unit tested with plain values in and plain values out (e.g. the scoring rule is a pure function
  with no framework dependency at all).
- Repository interfaces live in the domain layer; concrete implementations (`Prisma<X>Repository`
  classes) live in the data layer and are injected, so swapping a data source never touches
  business logic. A module can also export its repository token for another module to depend on
  (e.g. the teams module exports `TEAM_REPOSITORY` so the players and matches modules can confirm a
  team exists without duplicating that logic).
- Business failures throw one of the four domain error classes (`NotFoundError`, `ValidationError`,
  `ConflictError`, `UnauthorizedError`) instead of a plain `Error` or a NestJS HTTP exception. The
  global `DomainErrorFilter` maps each to the correct HTTP status (404/400/409/401) automatically,
  so use cases stay framework-agnostic and controllers don't need per-route try/catch for expected
  business failures.
- Presentation-layer DTOs are validated with `class-validator` decorators behind a global
  `ValidationPipe`, so malformed requests are rejected before they reach a controller.
- Controllers only orchestrate: they validate input via DTOs, instantiate the relevant use case
  directly (e.g. `new CreateTeamUseCase(this.teamRepository)`) rather than resolving it through
  NestJS's DI container, call it, and return its result. This direct-instantiation style is a
  deliberate, consistent pattern across every controller in the codebase — not an inconsistency to
  "fix."

No frontend exists yet — a React + Vite PWA is planned as a separate, not-yet-started phase.
Frontend-specific coding standards will be written once that work begins; this document covers the
backend only.

## TypeScript specifics

- Use `readonly` on arrays and object properties that shouldn't be mutated.
- Prefer `interface` over `type` for object shapes; use `type` for unions and primitives.
- Use `as const` for literal constants. Fixed sets of states (user role, match status, championship
  format) are modeled as proper enums (via Prisma-generated types) rather than ad hoc string
  unions, so the same set of valid values is enforced at both the database and the TypeScript
  level.
- Avoid `any`. Use `unknown` when the type isn't known, then narrow it.

## File structure per feature

Keep files small and focused:

- One exported class or function per file, one use case per file in `use-cases/`.
- Test files are colocated with their source file, using the `.spec.ts` suffix (the NestJS/Jest
  default), e.g. `app.controller.spec.ts` next to `app.controller.ts`.
- Use barrel exports (`index.ts`) where they simplify imports from a module.

## Formatting

The backend is TypeScript on NestJS; formatting and linting are enforced automatically as part of
the workflow rather than left to manual review comments — no unformatted code is merged. This
document doesn't itemize the exact linter/formatter configuration; check the backend package
itself for the current setup.

There is no frontend yet, so there is nothing to format there.

## Tests

- **Domain and use-case layers** require unit tests with mocked repositories — they're pure or
  near-pure, so this should be cheap. The project follows TDD discipline (a failing test written
  before the implementation that makes it pass).
- As of the last commit, the suite has 12 test suites / 32 tests passing, all unit tests against
  mocked repositories — this is the project's actual test strategy, not just a supplement to it.
- Test files use the `*.spec.ts` pattern and are colocated with their source. Use `describe`/`it`/
  `expect` blocks following Jest conventions; each test covers one scenario.
- **Open item:** `backend/test/app.e2e-spec.ts`, the default NestJS-CLI-generated smoke test, is
  only partially fixed — ts-jest has trouble resolving the Prisma-generated client's ESM-style
  imports. A `moduleNameMapper` config and a `setupFiles` dotenv loader were added, but the test is
  not fully green as of the last commit. This is a tracked, open follow-up, not something this
  document should describe as done.
- A dedicated integration-test suite for repository implementations against a real (e.g.
  containerized) Postgres does not exist yet; the current strategy relies on mocked-repository unit
  tests plus manual verification against a live database during development. Whether to add
  automated repository-level integration tests later is an open question, not yet decided.
