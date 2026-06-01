import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { getTestDb, resetTestDb, closeTestDb, type TestDb } from "../helpers/db";
import { InMemoryStorageClient } from "../../core/storage";
import {
  uploadFixtureVersion,
  safeFileName,
  disambiguateSlug,
} from "../../lib/fixtures/upload";
import { fixtureModes, fixtureVersions, fixtures, manufacturers } from "../../db/schema";

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

describe("safeFileName", () => {
  it("strips directory components and unsafe characters", () => {
    expect(safeFileName("../../etc/passwd")).toBe("passwd");
    expect(safeFileName("C:\\evil\\f.dfix")).toBe("f.dfix");
    expect(safeFileName("my fixture (v2).dfix")).toBe("my_fixture__v2_.dfix");
    expect(safeFileName("....")).toBe("file");
    expect(safeFileName("")).toBe("file");
  });
});

describe("disambiguateSlug", () => {
  it("returns the base when it is free", () => {
    expect(disambiguateSlug("robe", [])).toBe("robe");
  });
  it("appends an incrementing counter when the base is taken", () => {
    expect(disambiguateSlug("robe", ["robe"])).toBe("robe-2");
    expect(disambiguateSlug("robe", ["robe", "robe-2"])).toBe("robe-3");
  });
});

describe("uploadFixtureVersion", () => {
  it("disambiguates the manufacturer slug when two names slugify the same", async () => {
    const a = await uploadFixtureVersion({ db, storage }, newFixtureInput({ manufacturer: "Robe", name: "A" }));
    const b = await uploadFixtureVersion(
      { db, storage },
      newFixtureInput({ manufacturer: "ROBE", name: "B", dfix: dfix("B") }),
    );
    expect(a.ok && b.ok).toBe(true);
    const slugs = (await db.select().from(manufacturers)).map((m) => m.slug).sort();
    expect(slugs).toEqual(["robe", "robe-2"]);
  });

  it("disambiguates the fixture slug within a manufacturer", async () => {
    await uploadFixtureVersion({ db, storage }, newFixtureInput({ name: "Mega Pointe", dfix: dfix("1") }));
    await uploadFixtureVersion({ db, storage }, newFixtureInput({ name: "Mega-Pointe", dfix: dfix("2") }));
    const slugs = (await db.select().from(fixtures)).map((f) => f.slug).sort();
    expect(slugs).toEqual(["mega-pointe", "mega-pointe-2"]);
    // Both belong to the single, reused manufacturer.
    expect(await db.select().from(manufacturers)).toHaveLength(1);
  });

  it("rejects an oversized .dfix with 413 and writes nothing", async () => {
    process.env.MAX_UPLOAD_BYTES = "3";
    try {
      const r = await uploadFixtureVersion(
        { db, storage },
        newFixtureInput({ dfix: dfix("WAY TOO BIG") }),
      );
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error("expected failure");
      expect(r.status).toBe(413);
      expect(await db.select().from(fixtureVersions)).toHaveLength(0);
      expect(storage.keys()).toEqual([]);
    } finally {
      delete process.env.MAX_UPLOAD_BYTES;
    }
  });

  it("sanitizes a malicious .dfix filename in the storage key", async () => {
    const r = await uploadFixtureVersion(
      { db, storage },
      { ...newFixtureInput(), dfix: { bytes: enc.encode("X"), fileName: "../../../evil.dfix" } },
    );
    if (!r.ok) throw new Error("expected ok");
    const [v] = await db.select().from(fixtureVersions);
    expect(v.dfixFileKey).not.toContain("..");
    expect(v.dfixFileKey.endsWith("/evil.dfix")).toBe(true);
  });

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
