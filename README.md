# Lumiverse

A web application for managing [Syncronorm Depence](https://syncronorm.com/) `.dfix` fixture models with metadata and version history — the MVP slice of the "GitHub + npm Registry for lighting assets" idea in [`lumiverse_idea.md`](./lumiverse_idea.md).

## What it does (MVP)

- **Upload** `.dfix` files with manually-entered metadata (manufacturer, name, type, tags, Depence compatibility, DMX modes) and a changelog.
- **Version history** per fixture, with byte-identical re-uploads rejected and renamed duplicates flagged.
- **Search** by full text (name, manufacturer, tags, description) and filters (manufacturer, fixture type, channel-count range, Depence compatibility, tags), paginated.
- **Fixture detail pages** showing metadata, the full version history, per-version modes/assets, and a short-lived signed download link.
- **Auth** (optional): email/password login with admin/member roles, or a no-login local single-user mode.

Not yet built (see `lumiverse_idea.md` phases 2–5): `.dfix` parsing/auto-extraction, diff engine, GDTF/MVR, AI tooling, reputation/trust, forking, CLI, comments.

## Stack

- **Next.js** (App Router) + TypeScript, deployed on Vercel
- **PostgreSQL** + **Drizzle ORM** (schema/migrations)
- **Cloudflare R2** (S3-compatible) for file storage, behind a `StorageClient` interface (in-memory fallback for tests/local)
- **Auth.js (NextAuth v5)** credentials provider, gated by `AUTH_ENABLED`
- **Vitest** (+ `@amiceli/vitest-cucumber` for Gherkin feature tests), **Playwright** for an e2e smoke test
- CI: GitHub Actions (lint + typecheck + tests against a Postgres service container)

## Layout

```
app/         Next.js routes — pages (search, fixture detail, upload, auth) and API routes (fixtures, download-url, auth)
core/        Framework-agnostic domain logic: checksum + dedup, semver, fixture metadata validation, slugify, search params, storage abstraction
lib/         Server services that touch the DB/storage: auth (users, password, guard, session), fixtures (upload, search, detail)
db/          Drizzle schema, migrations, repository helpers
auth.ts      NextAuth configuration
tests/       unit/ (Vitest), features/ (Gherkin), e2e/ (Playwright), helpers/ (test DB)
docs/        Design spec under docs/superpowers/specs/
```

## Getting started

```bash
pnpm install
cp .env.example .env        # fill in DATABASE_URL (and R2_* / AUTH_SECRET if you want)
pnpm db:migrate             # apply migrations to your Postgres
pnpm dev                    # http://localhost:3000
```

### Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Neon, Supabase, or local) |
| `AUTH_ENABLED` | `"true"` to require login + enforce roles; `"false"`/unset = local single-user mode |
| `AUTH_SECRET` | Session-JWT signing secret; required when `AUTH_ENABLED=true` (`openssl rand -base64 32`) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Cloudflare R2 credentials; if unset, an in-memory store is used (not persistent) |
| `R2_SIGNED_URL_TTL` | Signed download-URL TTL in seconds (default 600) |

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js dev / production build / serve |
| `pnpm lint` | ESLint (`next lint`) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` / `pnpm test:watch` | Vitest (unit + Gherkin feature tests; needs `DATABASE_URL` for the DB-backed suites) |
| `pnpm test:e2e` | Playwright smoke test (needs `pnpm exec playwright install chromium`, a DB, and a running app; not run in CI) |
| `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:push` | Drizzle migration tooling |

## Testing notes

- The DB-backed unit/feature tests connect to `DATABASE_URL` (or `postgresql://postgres:postgres@localhost:5432/lumiverse_test`), run migrations once per process, and truncate tables between tests. Run them with a disposable database.
- Development follows SDD (the spec in `docs/superpowers/specs/` is the source of truth), TDD (domain logic in `core/` is written test-first), and BDD (`tests/features/*.feature` + `.steps.ts` for user-facing flows).

## Status

All eight MVP issues are merged. Known follow-ups are tracked in the issue tracker (e.g. hardening upload edge cases — slug collisions, size limits, upload-form parity, asset serving, and wiring the Playwright smoke test into CI).
