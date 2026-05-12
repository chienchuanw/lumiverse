import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { getTestDb, resetTestDb, closeTestDb, type TestDb } from "../helpers/db";
import { InMemoryStorageClient } from "../../core/storage";
import { uploadFixtureVersion } from "../../lib/fixtures/upload";
import { fixtureModes, fixtureVersions } from "../../db/schema";

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
const dfix = (content = "DFIX") => ({ bytes: enc.encode(content), fileName: "f.dfix" });

function newFixtureInput(overrides = {}) {
  return {
    manufacturer: "Robe",
    name: "MegaPointe",
    fixtureType: "Moving Head",
    tags: ["beam"],
    version: "1.0.0",
    changelog: "Initial",
    depenceCompatibility: ["R3", "R4"],
    modes: [{ name: "Standard", channelCount: 24 }],
    dfix: dfix(),
    ...overrides,
  };
}

describe("uploadFixtureVersion", () => {
  it("creates a new fixture with version, mode, and stored file", async () => {
    const r = await uploadFixtureVersion(
      { db, storage },
      { ...newFixtureInput(), previewImages: [{ bytes: enc.encode("img"), fileName: "p.png", contentType: "image/png" }] },
    );
    expect(r.ok && r.status).toBe(201);
    if (!r.ok) throw new Error("expected ok");

    const versions = await db.select().from(fixtureVersions);
    expect(versions).toHaveLength(1);
    expect(versions[0].dfixFileKey).toContain(r.fixtureId);
    const modes = await db.select().from(fixtureModes);
    expect(modes).toHaveLength(1);
    await expect(storage.get(versions[0].dfixFileKey)).resolves.toBeInstanceOf(Uint8Array);
  });

  it("adds a second version to an existing fixture", async () => {
    const first = await uploadFixtureVersion({ db, storage }, newFixtureInput());
    if (!first.ok) throw new Error("expected ok");
    const second = await uploadFixtureVersion(
      { db, storage },
      { fixtureId: first.fixtureId, version: "1.1.0", changelog: "gobo fix", dfix: dfix("DFIX-V2") },
    );
    expect(second.ok && second.status).toBe(201);
    expect(await db.select().from(fixtureVersions)).toHaveLength(2);
  });

  it("rejects a byte-identical re-upload to the same fixture with 409", async () => {
    const first = await uploadFixtureVersion({ db, storage }, newFixtureInput());
    if (!first.ok) throw new Error("expected ok");
    const dup = await uploadFixtureVersion(
      { db, storage },
      { fixtureId: first.fixtureId, version: "2.0.0", dfix: dfix("DFIX") },
    );
    expect(dup.ok).toBe(false);
    if (dup.ok) throw new Error("expected failure");
    expect(dup.status).toBe(409);
    expect(await db.select().from(fixtureVersions)).toHaveLength(1);
  });

  it("allows the same file under a different fixture and warns", async () => {
    await uploadFixtureVersion({ db, storage }, newFixtureInput());
    const other = await uploadFixtureVersion(
      { db, storage },
      { ...newFixtureInput(), name: "Spiider", dfix: dfix("DFIX") },
    );
    expect(other.ok && other.status).toBe(201);
    if (!other.ok) throw new Error("expected ok");
    expect(other.warnings.join(" ")).toMatch(/identical/i);
  });

  it("returns 400 for invalid metadata and writes nothing", async () => {
    const r = await uploadFixtureVersion(
      { db, storage },
      { ...newFixtureInput(), version: "not-semver" },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.status).toBe(400);
    expect(r.errors.some((e) => e.field === "version")).toBe(true);
    expect(await db.select().from(fixtureVersions)).toHaveLength(0);
  });

  it("returns 404 for an unknown fixtureId", async () => {
    const r = await uploadFixtureVersion(
      { db, storage },
      { fixtureId: "00000000-0000-0000-0000-000000000000", version: "1.0.0", dfix: dfix() },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.status).toBe(404);
  });

  it("cleans up the stored file when the DB transaction fails", async () => {
    const first = await uploadFixtureVersion({ db, storage }, newFixtureInput());
    if (!first.ok) throw new Error("expected ok");
    // Reusing version "1.0.0" on the same fixture passes the dup check (different
    // bytes) but violates unique(fixture_id, version) inside the transaction.
    await expect(
      uploadFixtureVersion(
        { db, storage },
        { fixtureId: first.fixtureId, version: "1.0.0", dfix: dfix("DIFFERENT-BYTES") },
      ),
    ).rejects.toThrow();
    const versions = await db.select().from(fixtureVersions);
    expect(versions).toHaveLength(1);
    // No orphaned object: the only key left is the surviving version's file.
    expect(storage.keys()).toEqual([versions[0].dfixFileKey]);
  });
});
