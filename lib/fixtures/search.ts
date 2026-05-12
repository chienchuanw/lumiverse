import { and, arrayOverlaps, eq, inArray, or, sql } from "drizzle-orm";
import type { Db } from "../../db";
import {
  fixtureModes,
  fixtureVersions,
  fixtures,
  manufacturers,
} from "../../db/schema";
import { currentVersion } from "../../core/fixtures";
import type { SearchParams } from "../../core/search";

export interface VersionSummary {
  id: string;
  version: string;
  createdAt: Date;
  changelog: string | null;
  depenceCompatibility: string[];
  modes: { name: string; channelCount: number }[];
}

export interface FixtureSearchResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fixtureType: string | null;
  tags: string[];
  manufacturer: { id: string; name: string; slug: string };
  currentVersion: VersionSummary | null;
}

export interface SearchResponse {
  items: FixtureSearchResult[];
  total: number;
  page: number;
  pageSize: number;
}

const SEARCH_VECTOR = (q: string) =>
  sql`to_tsvector('english',
        ${fixtures.name} || ' ' || ${manufacturers.name} || ' ' ||
        coalesce(${fixtures.description}, '') || ' ' ||
        array_to_string(${fixtures.tags}, ' ')
      ) @@ websearch_to_tsquery('english', ${q})`;

export async function searchFixtures(db: Db, params: SearchParams): Promise<SearchResponse> {
  const conditions = [];
  if (params.q) conditions.push(SEARCH_VECTOR(params.q));
  if (params.manufacturer) {
    conditions.push(
      or(eq(manufacturers.name, params.manufacturer), eq(manufacturers.slug, params.manufacturer)),
    );
  }
  if (params.fixtureType) conditions.push(eq(fixtures.fixtureType, params.fixtureType));
  if (params.tags?.length) conditions.push(arrayOverlaps(fixtures.tags, params.tags));

  const candidates = await db
    .select({
      id: fixtures.id,
      name: fixtures.name,
      slug: fixtures.slug,
      description: fixtures.description,
      fixtureType: fixtures.fixtureType,
      tags: fixtures.tags,
      mId: manufacturers.id,
      mName: manufacturers.name,
      mSlug: manufacturers.slug,
    })
    .from(fixtures)
    .innerJoin(manufacturers, eq(fixtures.manufacturerId, manufacturers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(fixtures.name);

  if (candidates.length === 0) {
    return { items: [], total: 0, page: params.page, pageSize: params.pageSize };
  }

  const ids = candidates.map((c) => c.id);
  const versions = await db
    .select()
    .from(fixtureVersions)
    .where(inArray(fixtureVersions.fixtureId, ids));
  const versionIds = versions.map((v) => v.id);
  const modes = versionIds.length
    ? await db.select().from(fixtureModes).where(inArray(fixtureModes.fixtureVersionId, versionIds))
    : [];

  const modesByVersion = new Map<string, { name: string; channelCount: number }[]>();
  for (const m of modes) {
    const list = modesByVersion.get(m.fixtureVersionId) ?? [];
    list.push({ name: m.name, channelCount: m.channelCount });
    modesByVersion.set(m.fixtureVersionId, list);
  }
  const versionsByFixture = new Map<string, typeof versions>();
  for (const v of versions) {
    const list = versionsByFixture.get(v.fixtureId) ?? [];
    list.push(v);
    versionsByFixture.set(v.fixtureId, list);
  }

  const enriched: FixtureSearchResult[] = candidates.map((c) => {
    const vs = versionsByFixture.get(c.id) ?? [];
    const currentStr = currentVersion(vs.map((v) => v.version));
    const cur = currentStr ? (vs.find((v) => v.version === currentStr) ?? null) : null;
    const currentVersionSummary: VersionSummary | null = cur
      ? {
          id: cur.id,
          version: cur.version,
          createdAt: cur.createdAt,
          changelog: cur.changelog,
          depenceCompatibility: cur.depenceCompatibility,
          modes: modesByVersion.get(cur.id) ?? [],
        }
      : null;
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      fixtureType: c.fixtureType,
      tags: c.tags,
      manufacturer: { id: c.mId, name: c.mName, slug: c.mSlug },
      currentVersion: currentVersionSummary,
    };
  });

  const filtered = enriched.filter((f) => {
    if (params.channelMin !== undefined || params.channelMax !== undefined) {
      const min = params.channelMin ?? 0;
      const max = params.channelMax ?? Infinity;
      const ok = (f.currentVersion?.modes ?? []).some(
        (m) => m.channelCount >= min && m.channelCount <= max,
      );
      if (!ok) return false;
    }
    if (params.compatibility?.length) {
      const have = new Set(f.currentVersion?.depenceCompatibility ?? []);
      if (!params.compatibility.some((c) => have.has(c))) return false;
    }
    return true;
  });

  const start = (params.page - 1) * params.pageSize;
  return {
    items: filtered.slice(start, start + params.pageSize),
    total: filtered.length,
    page: params.page,
    pageSize: params.pageSize,
  };
}
