import { getDb } from "@/db";
import { getStorageClient } from "@/core/storage";
import { getSessionOrNull } from "@/lib/auth/session";
import { assertCanWrite, UnauthorizedError, type SessionUser } from "@/lib/auth/guard";
import {
  uploadFixtureVersion,
  type UploadFileInput,
  type UploadFixtureVersionInput,
} from "@/lib/fixtures/upload";

async function fileToInput(file: File): Promise<UploadFileInput> {
  return {
    bytes: new Uint8Array(await file.arrayBuffer()),
    fileName: file.name,
    contentType: file.type || undefined,
  };
}

function str(form: FormData, key: string): string | undefined {
  const v = form.get(key);
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

function strList(form: FormData, key: string): string[] | undefined {
  const all = form.getAll(key).filter((v): v is string => typeof v === "string" && v.trim() !== "");
  if (all.length === 0) return undefined;
  // Accept both repeated fields and a single comma-separated value.
  return all.length === 1 ? all[0].split(",").map((s) => s.trim()).filter(Boolean) : all;
}

function parseModes(form: FormData): UploadFixtureVersionInput["modes"] {
  const raw = form.get("modes");
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    return parsed as UploadFixtureVersionInput["modes"];
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  try {
    assertCanWrite(await getSessionOrNull());
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return Response.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const dfixFile = form.get("dfix");
  if (!(dfixFile instanceof File)) {
    return Response.json({ error: "A .dfix file is required." }, { status: 400 });
  }
  const images = form.getAll("previewImages").filter((v): v is File => v instanceof File);

  const session = await getSessionOrNull();
  const createdBy =
    session?.user && "id" in session.user ? (session.user as SessionUser).id : undefined;

  const input: UploadFixtureVersionInput = {
    fixtureId: str(form, "fixtureId"),
    manufacturer: str(form, "manufacturer"),
    name: str(form, "name"),
    fixtureType: str(form, "fixtureType"),
    description: str(form, "description"),
    tags: strList(form, "tags"),
    version: str(form, "version") ?? "",
    changelog: str(form, "changelog"),
    depenceCompatibility: strList(form, "depenceCompatibility"),
    modes: parseModes(form),
    dfix: await fileToInput(dfixFile),
    previewImages: await Promise.all(images.map(fileToInput)),
    createdBy,
  };

  const result = await uploadFixtureVersion(
    { db: getDb(), storage: getStorageClient() },
    input,
  );

  if (!result.ok) {
    return Response.json({ errors: result.errors }, { status: result.status });
  }
  return Response.json(
    {
      fixtureId: result.fixtureId,
      versionId: result.versionId,
      warnings: result.warnings,
    },
    { status: 201, headers: { Location: `/fixtures/${result.fixtureId}` } },
  );
}
