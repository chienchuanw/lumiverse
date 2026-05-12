# Lumiverse MVP — Design Spec

> Codename: `Lumiverse`. A web application to manage Depence `.dfix` fixture models with metadata and version history.
> Source roadmap: `lumiverse_idea.md`. This spec scopes only the MVP (a slice of "Phase 1 — Metadata Registry" plus lightweight versioning).

## 1. Goals & Non-Goals

### Goals
- Store, browse, search, and download Depence `.dfix` fixtures with manually-entered metadata.
- Track an ordered version history per fixture, with changelog notes, checksums, and Depence compatibility tags.
- Reject byte-identical re-uploads; warn on renamed duplicates.
- Run two ways from one codebase: local single-user mode (no auth) and small private team mode (email/password auth).
- Development follows SDD (this spec is the source of truth), TDD (unit tests first for domain logic), and BDD (Gherkin-style feature tests for user flows).

### Non-Goals (deferred to later phases)
- `.dfix` parsing / metadata auto-extraction.
- Fixture diff engine.
- GDTF / MVR import/export.
- AI-assisted fixture generation, gobo extraction, PDF parsing.
- Reputation / trust / verification system, accuracy scores.
- Fixture forking, internal CLI.
- Comments, multi-role moderation beyond admin/member.

## 2. Tech Stack
- **Next.js (App Router), full-stack**, deployed on Vercel.
- **Postgres** (Neon or Supabase free tier) via **Drizzle ORM** for schema + migrations.
- **Cloudflare R2** for `.dfix` files and preview images, accessed only through a `StorageClient` interface (R2 impl + in-memory test impl). Downloads via short-lived signed URLs.
- **Auth.js (NextAuth) credentials provider** — email/password — gated by an `AUTH_ENABLED` env flag.
- **Search**: Postgres full-text (`tsvector`) + structured filters. Meilisearch is a later swap behind the same `core/search` interface.
- **Testing**: Vitest (unit + feature/BDD), a Gherkin-style runner for feature specs, Playwright for a small number of UI smoke tests. CI via GitHub Actions.

## 3. Architecture

```
app/                    UI routes + route handlers (thin: auth check → call core/ → return)
  (pages)               search, fixture detail, upload, auth
  api/                  upload, download-url, search
core/                   framework-agnostic domain logic
  fixtures/             create version, list history, validate metadata, semver ordering
  checksum/             SHA-256, exact-dup + cross-fixture-dup detection
  search/               query builder over the repository layer
  storage/              StorageClient interface (R2 impl + in-memory test impl)
db/                     Drizzle schema, migrations, repository functions
tests/
  unit/                 pure tests for core/
  features/             Gherkin-style end-to-end scenarios
```

Principle: **no business logic in route handlers.** Handlers do auth + I/O marshalling only; everything else lives in `core/` as framework-agnostic functions so it can later be reused by a CLI or worker.

## 4. Data Model (Drizzle / Postgres)

```
users
  id, email (unique), password_hash, role ('admin'|'member'), created_at

manufacturers
  id, name (unique), slug (unique), created_at

fixtures
  id, manufacturer_id → manufacturers, name, slug, description,
  fixture_type, tags (text[]), created_by → users, created_at, updated_at
  unique(manufacturer_id, slug)

fixture_versions
  id, fixture_id → fixtures, version (semver string), changelog (text),
  dfix_file_key (R2 key), dfix_checksum (sha256 hex), file_size (bytes),
  depence_compatibility (text[]),
  processing_status ('ready'|'pending'|'failed') default 'ready',
  created_by → users, created_at
  unique(fixture_id, version)
  unique(fixture_id, dfix_checksum)

fixture_modes
  id, fixture_version_id → fixture_versions, name, channel_count

fixture_assets
  id, fixture_version_id → fixture_versions, kind ('preview_image'|'doc'),
  file_key (R2 key), file_name, created_at
```

- A fixture's "current version" = the highest semver among its `fixture_versions`.
- Exact dedup enforced by `unique(fixture_id, dfix_checksum)`. A separate query detects the same checksum under a *different* fixture → non-blocking "renamed duplicate" warning.
- `processing_status` exists from day one so future async parsing needs no migration.

## 5. Key Flows

### Upload a fixture version
1. Form: choose existing fixture **or** create new (manufacturer, name, fixture_type, tags, description); version string; changelog; `.dfix` file; optional preview images; optional mode rows (name + channel_count).
2. Handler: auth check (if enabled) → stream file, compute SHA-256 → `core/checksum`: block exact dup (409), warn on cross-fixture dup → `StorageClient.put()` to R2 → in one DB transaction insert `fixture_versions` (+ `fixture_modes` + `fixture_assets`) → if DB fails after storage write, delete the orphaned R2 object.
3. Redirect to fixture detail page.

### Search
- Inputs: free-text query + filters (manufacturer, fixture_type, channel_count range, depence_compatibility, tags). `core/search` builds a parameterized query. Output: paginated fixtures with current-version summary.

### Fixture detail page
- Metadata, tags, manufacturer; version history (version, date, changelog, uploader); per-version modes + asset thumbnails; Download button → `/api/download-url` → short-lived signed R2 URL.

### Auth (when `AUTH_ENABLED`)
- Register (first registered user → `admin`, rest → `member`), login, logout; session via signed cookie. Upload/delete require a session; browse/search/download are public. When `AUTH_ENABLED` is false, the app runs with no login and all write actions are permitted locally.

## 6. Error Handling
- Validation errors → 400 with field-level messages.
- Duplicate checksum within a fixture → 409.
- Missing/insufficient auth → 401.
- Not found → 404.
- Storage write succeeds but DB transaction fails → roll back DB + delete orphaned R2 object.
- No silent failures; all errors surfaced to the user.

## 7. Testing Strategy (TDD / BDD / SDD)
- **SDD**: this document is the source of truth; every GitHub issue references it.
- **TDD**: `core/` logic written test-first — checksum + dedup detection, semver ordering, metadata validation, search query building. `StorageClient` in-memory impl keeps tests off R2.
- **BDD**: `tests/features/` Gherkin scenarios for user flows, e.g. "Given a fixture exists, When I upload a byte-identical `.dfix`, Then I see a duplicate error and no new version is created." Run against a test Postgres + in-memory storage.
- **UI smoke**: a handful of Playwright tests for the critical pages.
- **CI**: GitHub Actions runs unit + feature tests on every PR.

## 8. Out-of-scope reminders
Anything in `lumiverse_idea.md` Phases 2–5 not explicitly listed above is out of scope for the MVP.
