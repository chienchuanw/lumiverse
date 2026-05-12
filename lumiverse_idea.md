# Depence dfix Fixture Library Platform — Development Roadmap

> Project Codename: `Lumiverse`
>
> Goal:
> Build an ecosystem platform for managing, versioning, validating, searching, and
> sharing Syncronorm Depence dfix lighting fixture libraries and related visualization
> assets.

---

## 1. Vision

## Problem Statement

Current Depence fixture workflows are fragmented:

- Fixtures are exchanged via:
  - Google Drive
  - Dropbox
  - Discord
  - Facebook groups
  - private studio storage
- No centralized metadata indexing
- No version management
- No fixture validation pipeline
- No compatibility tracking
- No trust system
- No GDTF interoperability

The objective is to build:

## "GitHub + npm Registry for Lighting Assets"

---

## 2. Strategic Positioning

This should NOT merely become:

```text
A website for downloading dfix files
```

That is low defensibility.

Instead, the platform should evolve into:

## Lighting Asset Infrastructure

Supporting:

- Depence
- grandMA
- GDTF
- MVR
- Capture
- WYSIWYG
- Vectorworks
- Unreal DMX

Long-term positioning:

## Cross-platform Lighting Asset Ecosystem

---

## 3. Product Scope

### Phase 1 — Metadata Registry MVP

## Goal

Solve the industry's biggest pain point:

> "Finding the correct fixture version"

## Features

### Fixture Metadata Index

Each fixture contains:

```yaml
manufacturer:
fixture_name:
fixture_mode:
channels:
software_compatibility:
creator:
created_at:
updated_at:
version:
fixture_type:
tags:
```

### Search System

Support:

- fuzzy search
- tags
- fixture mode
- manufacturer
- beam type
- channel count
- software compatibility

### Fixture Detail Page

Contains:

- screenshots
- preview renders
- metadata
- version history
- changelog
- compatibility matrix
- user comments

### User System

Roles:

- guest
- contributor
- verified creator
- moderator
- admin

### Upload System

Allow:

- `.dfix`
- preview images
- documentation

### Compatibility Matrix

Track:

```text
Compatible with:
- Depence R3
- Depence R4
```

---

## Technical Stack

## Frontend

- Next.js
- TypeScript
- TailwindCSS
- shadcn/ui

## Backend

- FastAPI
- SQLAlchemy
- PostgreSQL

## Storage

- Cloudflare R2
  or
- AWS S3

## Search

Initial:

- PostgreSQL Full Text Search

Later:

- Meilisearch
  or
- Elasticsearch

---

### Phase 2 — Versioning & Dependency System

#### Versioning Features

### Semantic Versioning

```text
MegaPointe
├── 1.0.0
├── 1.1.0
├── 2.0.0
```

### Changelog Tracking

Track:

- gobo fixes
- beam fixes
- photometric updates
- channel remapping
- prism correction

### Fixture Diff Engine

Display:

```text
Changed:
- Pan range
- Prism speed
- Dimmer curve
```

### Checksums

Prevent:

- duplicate uploads
- renamed duplicates
- corrupted fixtures

### Fixture Forking

```text
robe/megapointe
frankwang16/megapointe-tour-version
```

### Internal CLI

```bash
lumiverse install robe/megapointe
```

---

### Phase 3 — Validation & Trust System

#### Validation Features

### Verification System

```text
Verified by:
- Real Fixture Test
- LD Review
- Previz Studio
- Photometric Validation
```

### Fixture QA Pipeline

Automated tests:

- DMX validation
- channel consistency
- mode consistency
- naming conventions
- duplicate detection

### Accuracy Score

```text
Accuracy Score: 93%
```

### Reputation System

Users gain reputation via:

- uploads
- validations
- accepted fixes
- community reviews

---

### Phase 4 — GDTF / MVR Bridge

#### GDTF Features

### GDTF Import Pipeline

```text
.gdtf -> internal fixture schema
```

### Partial Auto-generation

Extract:

- DMX modes
- channels
- attributes
- wheels
- gobos

### Unified Fixture Schema

```yaml
fixture:
modes:
attributes:
geometry:
photometric:
compatibility:
```

---

### Phase 5 — AI-assisted Fixture Generation

#### AI Features

### Spec PDF Parsing

Input:

```text
Martin MAC Aura XIP PDF
```

AI extracts:

- DMX charts
- channel layouts
- photometric data

### AI Fixture Generator

Generate:

- base fixture definition
- wheel definitions
- channel mapping

### AI Gobo Extraction

Use computer vision to:

- isolate gobos
- classify gobos
- auto-generate wheel textures

### Natural Language Prompting

```text
Generate fixture based on:
Robe iFORTE LTX 56CH
```

---

## 4. System Architecture

```text
[ Next.js Frontend ]
          |
          v
[ FastAPI Gateway ]
          |
  -------------------
  |        |        |
  v        v        v
Postgres  Search   Object Storage
           |
      Meilisearch
```

---

## 5. Database Design

## fixtures

```sql
id
manufacturer_id
name
slug
description
created_by
created_at
updated_at
```

## fixture_versions

```sql
id
fixture_id
version
dfix_file_url
checksum
depence_version
compatibility
changelog
created_at
```

## fixture_modes

```sql
id
fixture_version_id
name
channel_count
```

---

## 6. Infrastructure

### Hosting

#### Frontend Hosting

- Vercel

#### Backend Hosting

- Railway
- Fly.io
- AWS

## Object Storage

- Cloudflare R2

## Search Infrastructure

- Meilisearch

---

## 7. Security Considerations

## Required

- upload virus scanning
- MIME validation
- checksum validation
- rate limiting
- signed download URLs

---

## 8. Business Model

## Initial

Free community platform.

## Later

Potential monetization:

- private team libraries
- studio sync
- cloud backup
- verified fixtures
- AI fixture generation
- enterprise asset management

---

## 9. Biggest Risks

## Risk 1 — Syncronorm ecosystem lock-in

If Syncronorm changes:

- dfix structure
- compatibility
- licensing

the platform could break.

## Risk 2 — Small market

Depence is niche.

## Risk 3 — Copyright/IP

Fixture assets may involve:

- manufacturer IP
- textures
- gobos
- CAD data

Need moderation policy.

---

## 10. Recommended Development Order

## Stage 1

Build:

- metadata registry
- search
- upload
- fixture pages

## Stage 2

Build:

- versioning
- CLI sync
- trust system

## Stage 3

Build:

- GDTF normalization layer

## Stage 4

Build:

- AI-assisted tooling

---

## 11. Long-term Vision

The final form should become:

## "The GitHub + Docker Hub + npm Registry of the lighting industry"

Supporting:

- fixtures
- models
- gobos
- materials
- MVR
- GDTF
- visualization assets
- render presets
- show assets

Potential future integrations:

- grandMA
- Unreal Engine
- Capture
- WYSIWYG
- Vectorworks
- Blender
- AI rendering pipelines
