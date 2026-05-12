import { eq, inArray } from "drizzle-orm";
import type { Db } from "../../db";
import {
  fixtureAssets,
  fixtureModes,
  fixtureVersions,
  fixtures,
  manufacturers,
  users,
} from "../../db/schema";
import { compareSemver, parseSemver } from "../../core/fixtures";

export interface DetailMode {
  name: string;
  channelCount: number;
}

export interface DetailAsset {
  id: string;
  kind: "preview_image" | "doc";
  fileKey: string;
  fileName: string;
}

export interface DetailVersion {
  id: string;
  version: string;
  changelog: string | null;
  depenceCompatibility: string[];
  fileSize: number;
  createdAt: Date;
  uploadedBy: string | null;
  isCurrent: boolean;
  modes: DetailMode[];
  assets: DetailAsset[];
}

export interface FixtureDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fixtureType: string | null;
  tags: string[];
  createdAt: Date;
  manufacturer: { id: string; name: string; slug: string };
  versions: DetailVersion[];
}

/** Sort versions newest-first: valid semver descending, then invalid by createdAt desc. */
function sortVersions<T extends { version: string; createdAt: Date }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const pa = parseSemver(a.version);
    const pb = parseSemver(b.version);
    if (pa && pb) return -compareSemver(a.version, b.version);
    if (pa) return -1;
    if (pb) return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export async function getFixtureDetail(db: Db, fixtureId: string): Promise<FixtureDetail | null> {
  const [row] = await db
    .select({
      id: fixtures.id,
      name: fixtures.name,
      slug: fixtures.slug,
      description: fixtures.description,
      fixtureType: fixtures.fixtureType,
      tags: fixtures.tags,
      createdAt: fixtures.createdAt,
      mId: manufacturers.id,
      mName: manufacturers.name,
      mSlug: manufacturers.slug,
    })
    .from(fixtures)
    .innerJoin(manufacturers, eq(fixtures.manufacturerId, manufacturers.id))
    .where(eq(fixtures.id, fixtureId))
    .limit(1);
  if (!row) return null;

  const versionRows = await db
    .select({
      id: fixtureVersions.id,
      version: fixtureVersions.version,
      changelog: fixtureVersions.changelog,
      depenceCompatibility: fixtureVersions.depenceCompatibility,
      fileSize: fixtureVersions.fileSize,
      createdAt: fixtureVersions.createdAt,
      uploadedBy: users.email,
    })
    .from(fixtureVersions)
    .leftJoin(users, eq(fixtureVersions.createdBy, users.id))
    .where(eq(fixtureVersions.fixtureId, fixtureId));

  const versionIds = versionRows.map((v) => v.id);
  const modeRows = versionIds.length
    ? await db.select().from(fixtureModes).where(inArray(fixtureModes.fixtureVersionId, versionIds))
    : [];
  const assetRows = versionIds.length
    ? await db.select().from(fixtureAssets).where(inArray(fixtureAssets.fixtureVersionId, versionIds))
    : [];

  const modesByVersion = new Map<string, DetailMode[]>();
  for (const m of modeRows) {
    const list = modesByVersion.get(m.fixtureVersionId) ?? [];
    list.push({ name: m.name, channelCount: m.channelCount });
    modesByVersion.set(m.fixtureVersionId, list);
  }
  const assetsByVersion = new Map<string, DetailAsset[]>();
  for (const a of assetRows) {
    const list = assetsByVersion.get(a.fixtureVersionId) ?? [];
    list.push({ id: a.id, kind: a.kind, fileKey: a.fileKey, fileName: a.fileName });
    assetsByVersion.set(a.fixtureVersionId, list);
  }

  const sorted = sortVersions(versionRows);
  const currentId = sorted.find((v) => parseSemver(v.version))?.id ?? sorted[0]?.id;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    fixtureType: row.fixtureType,
    tags: row.tags,
    createdAt: row.createdAt,
    manufacturer: { id: row.mId, name: row.mName, slug: row.mSlug },
    versions: sorted.map((v) => ({
      id: v.id,
      version: v.version,
      changelog: v.changelog,
      depenceCompatibility: v.depenceCompatibility,
      fileSize: v.fileSize,
      createdAt: v.createdAt,
      uploadedBy: v.uploadedBy ?? null,
      isCurrent: v.id === currentId,
      modes: modesByVersion.get(v.id) ?? [],
      assets: assetsByVersion.get(v.id) ?? [],
    })),
  };
}

/** Returns a short-lived signed download URL for a version's .dfix, or null if unknown. */
export async function getVersionDownloadUrl(
  db: Db,
  storage: { getSignedUrl(key: string): Promise<string> },
  versionId: string,
): Promise<string | null> {
  const [v] = await db
    .select({ key: fixtureVersions.dfixFileKey })
    .from(fixtureVersions)
    .where(eq(fixtureVersions.id, versionId))
    .limit(1);
  if (!v) return null;
  return storage.getSignedUrl(v.key);
}
