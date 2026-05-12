import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { getTestDb, resetTestDb, closeTestDb, type TestDb } from "../helpers/db";
import { makeRepositories, type Repositories } from "../../db/repositories";

let db: TestDb;
let repos: Repositories;

beforeAll(async () => {
  db = await getTestDb();
  repos = makeRepositories(db);
});
beforeEach(resetTestDb);
afterAll(closeTestDb);

describe("repositories", () => {
  it("creates and reads a manufacturer", async () => {
    const created = await repos.manufacturers.create({ name: "Robe", slug: "robe" });
    expect(created.id).toBeDefined();
    const found = await repos.manufacturers.findById(created.id);
    expect(found?.name).toBe("Robe");
  });

  it("returns null from findById for an unknown id", async () => {
    const found = await repos.manufacturers.findById(
      "00000000-0000-0000-0000-000000000000",
    );
    expect(found).toBeNull();
  });

  it("lists all rows", async () => {
    await repos.manufacturers.create({ name: "A", slug: "a" });
    await repos.manufacturers.create({ name: "B", slug: "b" });
    expect(await repos.manufacturers.list()).toHaveLength(2);
  });

  it("updates a row and returns the updated record", async () => {
    const m = await repos.manufacturers.create({ name: "Old", slug: "old" });
    const updated = await repos.manufacturers.update(m.id, { name: "New" });
    expect(updated?.name).toBe("New");
    expect((await repos.manufacturers.findById(m.id))?.name).toBe("New");
  });

  it("returns null when updating an unknown id", async () => {
    expect(
      await repos.manufacturers.update(
        "00000000-0000-0000-0000-000000000000",
        { name: "x" },
      ),
    ).toBeNull();
  });

  it("removes a row", async () => {
    const m = await repos.manufacturers.create({ name: "X", slug: "x" });
    await repos.manufacturers.remove(m.id);
    expect(await repos.manufacturers.findById(m.id)).toBeNull();
  });

  it("exposes a repository for every table", () => {
    for (const key of [
      "users",
      "manufacturers",
      "fixtures",
      "fixtureVersions",
      "fixtureModes",
      "fixtureAssets",
    ] as const) {
      expect(repos[key]).toBeDefined();
      expect(typeof repos[key].create).toBe("function");
    }
  });

  it("supports the fixture -> version -> mode chain", async () => {
    const m = await repos.manufacturers.create({ name: "Robe", slug: "robe" });
    const f = await repos.fixtures.create({
      manufacturerId: m.id,
      name: "MegaPointe",
      slug: "megapointe",
    });
    const v = await repos.fixtureVersions.create({
      fixtureId: f.id,
      version: "1.0.0",
      dfixFileKey: "k",
      dfixChecksum: "s",
      fileSize: 100,
    });
    const mode = await repos.fixtureModes.create({
      fixtureVersionId: v.id,
      name: "Standard",
      channelCount: 24,
    });
    expect(mode.channelCount).toBe(24);
  });
});
