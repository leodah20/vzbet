# Local Development Setup

Step-by-step guide to get the backend API and its PostgreSQL database running from a fresh clone.

VZBet is backend-only at this stage — there is no frontend and no mobile app yet. A React + Vite
PWA frontend and a Render deployment are both planned as separate, not-yet-started phases; this
guide covers the backend only.

## Prerequisites

- Node.js and npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local PostgreSQL — no
  local Postgres install needed)

## 1. Start PostgreSQL

```bash
docker run --name vzbet-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=varzea_palpites \
  -p 5433:5432 -d postgres:16
```

This maps the container's Postgres (port 5432) to host port **5433**, not the default 5432. That's
specific to the machine this was developed on, where port 5432 was already taken by another local
Postgres container — it's an example, not a hard requirement. If 5432 is free on your machine, feel
free to use `-p 5432:5432` instead; just make sure the port in `DATABASE_URL` (step 3) matches
whatever you map here.

## 2. Install dependencies

```bash
cd backend
npm install
```

## 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `backend/.env` and set:

- `DATABASE_URL` — pointing at whichever host/port your Postgres container uses (see step 1)
- `JWT_SECRET` — **required**. The app now fails fast at startup if this is missing, rather than
  silently falling back to a default secret, so pick any long random string.

## 4. Run Prisma migrations

```bash
npx prisma migrate dev
```

Creates the tables from `backend/prisma/schema.prisma`. Re-run any time the schema changes.

## 5. Start the backend

```bash
npm run start:dev
```

## 6. Run the tests

```bash
npm test
```

As of the last commit, this runs 12 suites / 32 tests, all using mocked repositories (no live
database required for the test suite itself).

## 7. Prisma Studio (inspect the database in a browser)

```bash
npx prisma studio
```

Opens a local web UI (default `http://localhost:5555`) to browse and edit rows.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ReferenceError: exports is not defined in ES module scope` when the backend starts | Prisma 7 defaults to generating an ESM client, but Nest compiles to CommonJS. Make sure `schema.prisma`'s `generator client` block includes `moduleFormat = "cjs"` (alongside `provider = "prisma-client"` and an explicit `output`). |
| Prisma CLI commands (`migrate`, `generate`, `studio`) can't find the database, even though `DATABASE_URL` is set in `.env` | Prisma 7 removed the `url` line from `schema.prisma`'s `datasource` block. The URL now lives only in `backend/prisma.config.ts` (`datasource: { url: process.env.DATABASE_URL } }`), which is what the CLI reads. |
| Import errors around the generated Prisma client, or the client failing to connect at runtime | Two Prisma 7 changes to check: (1) the generated client's import path is `'../../generated/prisma/client'`, never `'@prisma/client'`; (2) the runtime client needs an explicit driver adapter — `PrismaService` must construct `new PrismaPg({ connectionString: process.env.DATABASE_URL })` and pass it as `{ adapter }`, which requires `@prisma/adapter-pg` and `pg` to be installed. |
| The app refuses to boot, complaining about a missing required environment variable | This is intentional — `JWT_SECRET` is now required, and the app deliberately fails fast at startup instead of silently signing tokens with a hardcoded default. Set `JWT_SECRET` in `backend/.env` (see step 3). |
| `docker run` fails because port 5432 (or whatever port you chose) is already allocated | Another Postgres container is already bound to that host port. Either stop it, or map the new container to a different host port (see step 1) and update `DATABASE_URL` to match. |

## Summary: first-time setup

```bash
# 1. Start the database
docker run --name vzbet-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=varzea_palpites \
  -p 5433:5432 -d postgres:16

# 2. Install dependencies
cd backend
npm install

# 3. Configure environment
cp .env.example .env
# then edit .env: set DATABASE_URL (matching the port above) and JWT_SECRET

# 4. Run migrations
npx prisma migrate dev

# 5. Start the backend
npm run start:dev

# 6. Run the tests
npm test
```
