import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { getTestDb, resetTestDb, closeTestDb, type TestDb } from "../helpers/db";
import { InMemoryStorageClient } from "../../core/storage";
import { uploadFixtureVersion } from "../../lib/fixtures/upload";
import { getFixtureDetail } from "../../lib/fixtures/detail";

let db: TestDb;
let storage: InMemoryStorageClient;

beforeAll(async () => {
  db = await getTestDb();
});
beforeEach(async () => {
  await resetTestDb();
  storage = new InMemoryStorageClient();
});
afterAll(closeTestDb);

const enc = new TextEncoder();

async function seedFixture(): Promise<string> {
  const first = await uploadFixtureVersion(
    { db, storage },
    {
      manufacturer: "Robe",
      name: "MegaPointe",
      fixtureType: "Moving Head",
      tags: ["beam", "spot"],
      description: "Hybrid",
      version: "1.0.0",
      changelog: "Initial",
      depenceCompatibility: ["R3", "R4"],
      modes: [{ name: "Standard", channelCount: 24 }],
      dfix: { bytes: enc.encode("v1"), fileName: "mp.dfix" },
      previewImages: [{ bytes: enc.encode("img"), fileName: "preview.png", contentType: "image/png" }],
    },
  );
  if (!first.ok) throw new Error("seed failed");
  await uploadFixtureVersion(
    { db, storage },
    {
      fixtureId: first.fixtureId,
      version: "2.0.0",
      changelog: "Photometric update",
      depenceCompatibility: ["R4"],
      modes: [{ name: "Extended", channelCount: 40 }],
      dfix: { bytes: enc.encode("v2"), fileName: "mp.dfix" },
    },
  );
  return first.fixtureId;
}

describe("getFixtureDetail", () => {
  it("returns null for an unknown fixture", async () => {
    expect(await getFixtureDetail(db, "00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("returns the fixture with manufacturer, tags, and version history newest-first", async () => {
    const id = await seedFixture();
    const detail = await getFixtureDetail(db, id);
    expect(detail).not.toBeNull();
    if (!detail) throw new Error("expected detail");

    expect(detail.manufacturer.name).toBe("Robe");
    expect(detail.tags).toEqual(["beam", "spot"]);
    expect(detail.versions.map((v) => v.version)).toEqual(["2.0.0", "1.0.0"]);

    const [current, previous] = detail.versions;
    expect(current.isCurrent).toBe(true);
    expect(previous.isCurrent).toBe(false);
    expect(current.modes).toEqual([{ name: "Extended", channelCount: 40 }]);
    expect(current.depenceCompatibility).toEqual(["R4"]);
  });

  it("includes per-version modes and assets", async () => {
    const id = await seedFixture();
    const detail = await getFixtureDetail(db, id);
    const v1 = detail!.versions.find((v) => v.version === "1.0.0")!;
    expect(v1.modes).toEqual([{ name: "Standard", channelCount: 24 }]);
    expect(v1.assets).toHaveLength(1);
    expect(v1.assets[0]).toMatchObject({ kind: "preview_image", fileName: "preview.png" });
    expect(v1.changelog).toBe("Initial");
  });
});
