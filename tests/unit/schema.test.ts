import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { fixtureVersions, fixtures, manufacturers } from "../../db/schema";
import { getTestDb, resetTestDb, closeTestDb, type TestDb } from "../helpers/db";

let db: TestDb;

beforeAll(async () => {
  db = await getTestDb();
});
beforeEach(resetTestDb);
afterAll(closeTestDb);

async function makeManufacturer(name = "Robe") {
  const [m] = await db
    .insert(manufacturers)
    .values({ name, slug: name.toLowerCase() })
    .returning();
  return m;
}

describe("schema constraints", () => {
  it("rejects a duplicate manufacturer slug", async () => {
    await db.insert(manufacturers).values({ name: "Robe", slug: "robe" });
    await expect(
      db.insert(manufacturers).values({ name: "Robe 2", slug: "robe" }),
    ).rejects.toThrow();
  });

  it("rejects a duplicate manufacturer name", async () => {
    await db.insert(manufacturers).values({ name: "Robe", slug: "robe" });
    await expect(
      db.insert(manufacturers).values({ name: "Robe", slug: "robe-2" }),
    ).rejects.toThrow();
  });

  it("rejects two fixtures with the same manufacturer and slug", async () => {
    const m = await makeManufacturer();
    await db
      .insert(fixtures)
      .values({ manufacturerId: m.id, name: "MegaPointe", slug: "megapointe" });
    await expect(
      db
        .insert(fixtures)
        .values({ manufacturerId: m.id, name: "MegaPointe X", slug: "megapointe" }),
    ).rejects.toThrow();
  });

  it("allows the same fixture slug under different manufacturers", async () => {
    const a = await makeManufacturer("Robe");
    const b = await makeManufacturer("Clay Paky");
    await db
      .insert(fixtures)
      .values({ manufacturerId: a.id, name: "X", slug: "x" });
    await expect(
      db.insert(fixtures).values({ manufacturerId: b.id, name: "X", slug: "x" }),
    ).resolves.toBeDefined();
  });

  it("rejects a duplicate version within a fixture", async () => {
    const m = await makeManufacturer();
    const [f] = await db
      .insert(fixtures)
      .values({ manufacturerId: m.id, name: "F", slug: "f" })
      .returning();
    const base = {
      fixtureId: f.id,
      version: "1.0.0",
      dfixFileKey: "k1",
      dfixChecksum: "sum1",
      fileSize: 10,
    };
    await db.insert(fixtureVersions).values(base);
    await expect(
      db.insert(fixtureVersions).values({ ...base, dfixFileKey: "k2", dfixChecksum: "sum2" }),
    ).rejects.toThrow();
  });

  it("rejects a duplicate checksum within a fixture", async () => {
    const m = await makeManufacturer();
    const [f] = await db
      .insert(fixtures)
      .values({ manufacturerId: m.id, name: "F", slug: "f" })
      .returning();
    await db.insert(fixtureVersions).values({
      fixtureId: f.id,
      version: "1.0.0",
      dfixFileKey: "k1",
      dfixChecksum: "samesum",
      fileSize: 10,
    });
    await expect(
      db.insert(fixtureVersions).values({
        fixtureId: f.id,
        version: "1.1.0",
        dfixFileKey: "k2",
        dfixChecksum: "samesum",
        fileSize: 10,
      }),
    ).rejects.toThrow();
  });

  it("allows the same checksum under different fixtures", async () => {
    const m = await makeManufacturer();
    const [f1] = await db
      .insert(fixtures)
      .values({ manufacturerId: m.id, name: "F1", slug: "f1" })
      .returning();
    const [f2] = await db
      .insert(fixtures)
      .values({ manufacturerId: m.id, name: "F2", slug: "f2" })
      .returning();
    await db.insert(fixtureVersions).values({
      fixtureId: f1.id,
      version: "1.0.0",
      dfixFileKey: "k1",
      dfixChecksum: "shared",
      fileSize: 10,
    });
    await expect(
      db.insert(fixtureVersions).values({
        fixtureId: f2.id,
        version: "1.0.0",
        dfixFileKey: "k2",
        dfixChecksum: "shared",
        fileSize: 10,
      }),
    ).resolves.toBeDefined();
  });

  it("defaults processing_status to 'ready' and tags/compat to empty arrays", async () => {
    const m = await makeManufacturer();
    const [f] = await db
      .insert(fixtures)
      .values({ manufacturerId: m.id, name: "F", slug: "f" })
      .returning();
    expect(f.tags).toEqual([]);
    const [v] = await db
      .insert(fixtureVersions)
      .values({
        fixtureId: f.id,
        version: "1.0.0",
        dfixFileKey: "k",
        dfixChecksum: "s",
        fileSize: 1,
      })
      .returning();
    expect(v.processingStatus).toBe("ready");
    expect(v.depenceCompatibility).toEqual([]);
  });

  it("cascades version/mode/asset deletes when a fixture is removed", async () => {
    const m = await makeManufacturer();
    const [f] = await db
      .insert(fixtures)
      .values({ manufacturerId: m.id, name: "F", slug: "f" })
      .returning();
    await db.insert(fixtureVersions).values({
      fixtureId: f.id,
      version: "1.0.0",
      dfixFileKey: "k",
      dfixChecksum: "s",
      fileSize: 1,
    });
    await db.delete(fixtures);
    const rows = await db.select().from(fixtureVersions);
    expect(rows).toHaveLength(0);
  });

  it("does not require created_by (nullable uploader)", async () => {
    const m = await makeManufacturer();
    await expect(
      db.insert(fixtures).values({ manufacturerId: m.id, name: "F", slug: "f" }),
    ).resolves.toBeDefined();
  });
});
