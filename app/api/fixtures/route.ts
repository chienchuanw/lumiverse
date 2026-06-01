import { getDb } from "@/db";
import { getStorageClient } from "@/core/storage";
import { getSessionOrNull } from "@/lib/auth/session";
import { assertCanWrite, UnauthorizedError, type SessionUser } from "@/lib/auth/guard";
import {
  maxUploadBytes,
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

type ParsedModes =
  | { ok: true; modes: UploadFixtureVersionInput["modes"] }
  | { ok: false };

/**
 * Parses the optional `modes` field. An absent/blank field is fine (no modes);
 * a present-but-unparseable field is a client error, surfaced as 400 rather
 * than dropped silently.
 */
function parseModes(form: FormData): ParsedModes {
  const raw = form.get("modes");
  if (typeof raw !== "string" || raw.trim() === "") return { ok: true, modes: undefined };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { ok: false };
    return { ok: true, modes: parsed as UploadFixtureVersionInput["modes"] };
  } catch {
    return { ok: false };
  }
}

export async function POST(request: Request) {
  // Resolve the session once: the guard and `createdBy` both need it.
  const session = await getSessionOrNull();
  try {
    assertCanWrite(session);
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
  // Reject oversized uploads before buffering the file into memory.
  const maxBytes = maxUploadBytes();
  if (dfixFile.size > maxBytes) {
    return Response.json(
      { error: `The .dfix file exceeds the ${maxBytes}-byte limit.` },
      { status: 413 },
    );
  }
  const modes = parseModes(form);
  if (!modes.ok) {
    return Response.json({ error: "The 'modes' field must be a JSON array." }, { status: 400 });
  }
  const images = form.getAll("previewImages").filter((v): v is File => v instanceof File);

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
    modes: modes.modes,
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
