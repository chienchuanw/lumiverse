import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { eq } from "drizzle-orm";
import { getTestDb, resetTestDb } from "../helpers/db";
import { resetStorageClient } from "../../core/storage";
import { fixtures, fixtureVersions, manufacturers } from "../../db/schema";
import { POST as uploadRoute } from "../../app/api/fixtures/route";

delete process.env.AUTH_ENABLED;
await getTestDb();

async function postUpload(fields: Record<string, string>, contents: string): Promise<Response> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  fd.set("dfix", new File([new TextEncoder().encode(contents)], "f.dfix"));
  return uploadRoute(new Request("http://test/api/fixtures", { method: "POST", body: fd }));
}

async function versionCountFor(manufacturer: string, name: string): Promise<number> {
  const db = await getTestDb();
  const [f] = await db
    .select({ id: fixtures.id })
    .from(fixtures)
    .innerJoin(manufacturers, eq(fixtures.manufacturerId, manufacturers.id))
    .where(eq(fixtures.name, name))
    .limit(1);
  if (!f) return 0;
  return (await db.select().from(fixtureVersions).where(eq(fixtureVersions.fixtureId, f.id))).length;
}

const feature = await loadFeature("tests/features/upload.feature");

describeFeature(feature, ({ Scenario }) => {
  Scenario("A new fixture is created from an upload", ({ Given, When, Then, And }) => {
    let response: Response;

    Given("an empty fixture catalogue", async () => {
      await resetTestDb();
      resetStorageClient();
    });

    When(
      `I upload {string} / {string} version {string} from a .dfix with contents {string}`,
      async (_: unknown, manufacturer: string, name: string, version: string, contents: string) => {
        response = await postUpload({ manufacturer, name, version }, contents);
      },
    );

    Then(`the upload succeeds with status {int}`, (_: unknown, status: number) => {
      expect(response.status).toBe(status);
    });

    And(`the catalogue has {int} fixture with {int} version`, async (_: unknown, fc: number, vc: number) => {
      expect(await (await getTestDb()).select().from(fixtures)).toHaveLength(fc);
      expect(await (await getTestDb()).select().from(fixtureVersions)).toHaveLength(vc);
    });
  });

  Scenario("A byte-identical re-upload to the same fixture is rejected", ({ Given, And, When, Then }) => {
    let response: Response;

    Given("an empty fixture catalogue", async () => {
      await resetTestDb();
      resetStorageClient();
    });

    And(
      `{string} / {string} version {string} was uploaded from a .dfix with contents {string}`,
      async (_: unknown, manufacturer: string, name: string, version: string, contents: string) => {
        const r = await postUpload({ manufacturer, name, version }, contents);
        expect(r.status).toBe(201);
      },
    );

    When(
      `I upload another version of {string} / {string} version {string} from a .dfix with contents {string}`,
      async (_: unknown, manufacturer: string, name: string, version: string, contents: string) => {
        const db = await getTestDb();
        const [f] = await db
          .select({ id: fixtures.id })
          .from(fixtures)
          .where(eq(fixtures.name, name))
          .limit(1);
        const fd = new FormData();
        fd.set("fixtureId", f.id);
        fd.set("version", version);
        fd.set("dfix", new File([new TextEncoder().encode(contents)], "f.dfix"));
        response = await uploadRoute(new Request("http://test/api/fixtures", { method: "POST", body: fd }));
      },
    );

    Then(`the upload is rejected with status {int}`, (_: unknown, status: number) => {
      expect(response.status).toBe(status);
    });

    And(`that fixture still has {int} version`, async (_: unknown, n: number) => {
      expect(await versionCountFor("Clay Paky", "Sharpy")).toBe(n);
    });
  });

  Scenario("The same .dfix under a different fixture is accepted with a warning", ({ Given, And, When, Then }) => {
    let response: Response;

    Given("an empty fixture catalogue", async () => {
      await resetTestDb();
      resetStorageClient();
    });

    And(
      `{string} / {string} version {string} was uploaded from a .dfix with contents {string}`,
      async (_: unknown, manufacturer: string, name: string, version: string, contents: string) => {
        const r = await postUpload({ manufacturer, name, version }, contents);
        expect(r.status).toBe(201);
      },
    );

    When(
      `I upload {string} / {string} version {string} from a .dfix with contents {string}`,
      async (_: unknown, manufacturer: string, name: string, version: string, contents: string) => {
        response = await postUpload({ manufacturer, name, version }, contents);
      },
    );

    Then(`the upload succeeds with status {int}`, (_: unknown, status: number) => {
      expect(response.status).toBe(status);
    });

    And(`the response warns that the file is byte-identical to another fixture`, async () => {
      const body = (await response.json()) as { warnings?: string[] };
      expect(String(body.warnings?.join(" "))).toMatch(/identical/i);
    });
  });
});
