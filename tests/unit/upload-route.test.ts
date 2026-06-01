import { describe, it, expect, afterEach, vi } from "vitest";
import { POST } from "../../app/api/fixtures/route";

// NextAuth doesn't import cleanly under Vitest's node environment, so stub the
// root auth module. getSessionOrNull() dynamically imports it only when
// AUTH_ENABLED is true; with this stub it resolves to "no session".
vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));

const enc = new TextEncoder();

function buildForm(
  fields: Record<string, string>,
  { contents = "DFIX", omitDfix = false }: { contents?: string; omitDfix?: boolean } = {},
): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  if (!omitDfix) fd.set("dfix", new File([enc.encode(contents)], "f.dfix"));
  return fd;
}

function post(fd: FormData): Promise<Response> {
  return POST(new Request("http://test/api/fixtures", { method: "POST", body: fd }));
}

const base = { manufacturer: "Robe", name: "MegaPointe", version: "1.0.0" };

const originalAuth = process.env.AUTH_ENABLED;
const originalMax = process.env.MAX_UPLOAD_BYTES;
afterEach(() => {
  if (originalAuth === undefined) delete process.env.AUTH_ENABLED;
  else process.env.AUTH_ENABLED = originalAuth;
  if (originalMax === undefined) delete process.env.MAX_UPLOAD_BYTES;
  else process.env.MAX_UPLOAD_BYTES = originalMax;
});

describe("POST /api/fixtures", () => {
  it("returns 400 when the modes field is not valid JSON", async () => {
    delete process.env.AUTH_ENABLED;
    const r = await post(buildForm({ ...base, modes: "{not valid json" }));
    expect(r.status).toBe(400);
  });

  it("returns 400 when modes is valid JSON but not an array", async () => {
    delete process.env.AUTH_ENABLED;
    const r = await post(buildForm({ ...base, modes: '{"name":"Standard"}' }));
    expect(r.status).toBe(400);
  });

  it("returns 413 when the .dfix exceeds the configured size limit", async () => {
    delete process.env.AUTH_ENABLED;
    process.env.MAX_UPLOAD_BYTES = "2";
    const r = await post(buildForm(base, { contents: "TOO BIG" }));
    expect(r.status).toBe(413);
  });

  it("returns 401 when auth is enabled and there is no session", async () => {
    process.env.AUTH_ENABLED = "true";
    const r = await post(buildForm(base));
    expect(r.status).toBe(401);
  });
});
