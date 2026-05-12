import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { getTestDb, resetTestDb, closeTestDb, type TestDb } from "../helpers/db";
import { getStorageClient, resetStorageClient } from "../../core/storage";
import { uploadFixtureVersion } from "../../lib/fixtures/upload";
import { fixtureVersions } from "../../db/schema";
import { GET as downloadUrlRoute } from "../../app/api/download-url/route";

let db: TestDb;

beforeAll(async () => {
  db = await getTestDb();
});
beforeEach(async () => {
  await resetTestDb();
  resetStorageClient();
});
afterAll(closeTestDb);

const enc = new TextEncoder();

async function seedVersion(): Promise<string> {
  const r = await uploadFixtureVersion(
    { db, storage: getStorageClient() },
    {
      manufacturer: "Robe",
      name: "MegaPointe",
      version: "1.0.0",
      dfix: { bytes: enc.encode("payload"), fileName: "mp.dfix" },
    },
  );
  if (!r.ok) throw new Error("seed failed");
  return r.versionId;
}

const get = (url: string) => downloadUrlRoute(new Request(url));

describe("GET /api/download-url", () => {
  it("returns a signed URL for a known version", async () => {
    const versionId = await seedVersion();
    const res = await get(`http://test/api/download-url?versionId=${versionId}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { url: string };
    expect(typeof body.url).toBe("string");
    const [v] = await db.select().from(fixtureVersions);
    expect(body.url).toContain(v.dfixFileKey);
  });

  it("returns 400 when versionId is missing", async () => {
    const res = await get("http://test/api/download-url");
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown version", async () => {
    const res = await get("http://test/api/download-url?versionId=00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});
