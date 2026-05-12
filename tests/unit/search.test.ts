import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { getTestDb, resetTestDb, closeTestDb, type TestDb } from "../helpers/db";
import { InMemoryStorageClient } from "../../core/storage";
import { uploadFixtureVersion } from "../../lib/fixtures/upload";
import { searchFixtures } from "../../lib/fixtures/search";
import { parseSearchParams } from "../../core/search";

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
const search = (qs: string) => searchFixtures(db, parseSearchParams(new URLSearchParams(qs)));

async function seed() {
  await uploadFixtureVersion(
    { db, storage },
    {
      manufacturer: "Robe",
      name: "MegaPointe",
      fixtureType: "Moving Head",
      description: "Compact beam-spot-wash hybrid",
      tags: ["beam", "spot"],
      version: "1.0.0",
      depenceCompatibility: ["R3", "R4"],
      modes: [{ name: "Standard", channelCount: 24 }],
      dfix: { bytes: enc.encode("mp1"), fileName: "mp.dfix" },
    },
  );
  // Add a second, higher version that bumps channel count and drops R3 support.
  const all = await db.query.fixtures.findMany();
  const mp = all.find((f) => f.name === "MegaPointe")!;
  await uploadFixtureVersion(
    { db, storage },
    {
      fixtureId: mp.id,
      version: "2.0.0",
      depenceCompatibility: ["R4"],
      modes: [{ name: "Extended", channelCount: 40 }],
      dfix: { bytes: enc.encode("mp2"), fileName: "mp.dfix" },
    },
  );
  await uploadFixtureVersion(
    { db, storage },
    {
      manufacturer: "Clay Paky",
      name: "Sharpy",
      fixtureType: "Moving Head",
      description: "Iconic beam fixture",
      tags: ["beam"],
      version: "1.0.0",
      depenceCompatibility: ["R3"],
      modes: [{ name: "Basic", channelCount: 16 }],
      dfix: { bytes: enc.encode("sh1"), fileName: "sh.dfix" },
    },
  );
}

describe("searchFixtures", () => {
  beforeEach(seed);

  it("returns all fixtures with their current-version summary when no query is given", async () => {
    const r = await search("");
    expect(r.total).toBe(2);
    const mp = r.items.find((i) => i.name === "MegaPointe")!;
    expect(mp.currentVersion?.version).toBe("2.0.0");
    expect(mp.currentVersion?.modes).toEqual([{ name: "Extended", channelCount: 40 }]);
    expect(mp.manufacturer.name).toBe("Robe");
  });

  it("full-text matches by name, manufacturer, tag, and description", async () => {
    expect((await search("q=megapointe")).items.map((i) => i.name)).toEqual(["MegaPointe"]);
    expect((await search("q=clay")).items.map((i) => i.name)).toEqual(["Sharpy"]);
    expect((await search("q=spot")).items.map((i) => i.name)).toEqual(["MegaPointe"]);
    expect((await search("q=iconic")).items.map((i) => i.name)).toEqual(["Sharpy"]);
    expect((await search("q=beam")).total).toBe(2);
  });

  it("filters by manufacturer name or slug", async () => {
    expect((await search("manufacturer=Robe")).items.map((i) => i.name)).toEqual(["MegaPointe"]);
    expect((await search("manufacturer=clay-paky")).items.map((i) => i.name)).toEqual(["Sharpy"]);
  });

  it("filters by fixture type and tags (AND across filters)", async () => {
    expect((await search("fixtureType=Moving%20Head")).total).toBe(2);
    expect((await search("tags=spot")).items.map((i) => i.name)).toEqual(["MegaPointe"]);
    expect((await search("fixtureType=Moving%20Head&tags=spot")).items.map((i) => i.name)).toEqual([
      "MegaPointe",
    ]);
  });

  it("filters by channel-count range against the current version", async () => {
    // MegaPointe's current version (2.0.0) has 40ch; Sharpy has 16ch.
    expect((await search("channelMin=30")).items.map((i) => i.name)).toEqual(["MegaPointe"]);
    expect((await search("channelMin=10&channelMax=20")).items.map((i) => i.name)).toEqual([
      "Sharpy",
    ]);
    // 24ch only existed in MegaPointe's *old* version, so it must not match.
    expect((await search("channelMin=22&channelMax=26")).total).toBe(0);
  });

  it("filters by Depence compatibility against the current version", async () => {
    // MegaPointe's current version dropped R3; only Sharpy is R3.
    expect((await search("compatibility=R3")).items.map((i) => i.name)).toEqual(["Sharpy"]);
    expect((await search("compatibility=R4")).items.map((i) => i.name)).toEqual(["MegaPointe"]);
  });

  it("paginates results", async () => {
    const p1 = await search("pageSize=1&page=1");
    const p2 = await search("pageSize=1&page=2");
    expect(p1.items).toHaveLength(1);
    expect(p2.items).toHaveLength(1);
    expect(p1.total).toBe(2);
    expect(p1.items[0].name).not.toBe(p2.items[0].name);
  });

  it("returns an empty page for a non-matching query", async () => {
    const r = await search("q=doesnotexist");
    expect(r).toMatchObject({ items: [], total: 0, page: 1 });
  });
});
