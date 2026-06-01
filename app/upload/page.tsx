import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { getStorageClient } from "@/core/storage";
import { getSessionOrNull } from "@/lib/auth/session";
import { assertCanWrite, type SessionUser } from "@/lib/auth/guard";
import {
  maxUploadBytes,
  uploadFixtureVersion,
  type UploadFileInput,
  type UploadModeInput,
} from "@/lib/fixtures/upload";
import { ModeRows } from "./mode-rows";

async function toFileInput(file: File): Promise<UploadFileInput> {
  return {
    bytes: new Uint8Array(await file.arrayBuffer()),
    fileName: file.name,
    contentType: file.type || undefined,
  };
}

/** Zip the paired modeName/modeChannelCount fields into mode rows, dropping blanks. */
function parseModeRows(formData: FormData): UploadModeInput[] {
  const names = formData.getAll("modeName").map(String);
  const counts = formData.getAll("modeChannelCount").map(String);
  return names
    .map((name, i) => ({ name: name.trim(), channelCount: Number(counts[i] ?? "") }))
    .filter((m) => m.name !== "");
}

export default function UploadPage(props: { searchParams: Promise<{ error?: string }> }) {
  async function upload(formData: FormData): Promise<void> {
    "use server";
    assertCanWrite(await getSessionOrNull());

    const dfix = formData.get("dfix");
    if (!(dfix instanceof File) || dfix.size === 0) redirect("/upload?error=dfix-required");
    if ((dfix as File).size > maxUploadBytes()) redirect("/upload?error=413");
    const file = await toFileInput(dfix as File);
    const session = await getSessionOrNull();
    const createdBy =
      session?.user && "id" in session.user ? (session.user as SessionUser).id : undefined;

    const tags = String(formData.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    const compat = String(formData.get("depenceCompatibility") ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    const modes = parseModeRows(formData);
    const imageFiles = formData
      .getAll("previewImages")
      .filter((v): v is File => v instanceof File && v.size > 0);
    const previewImages = await Promise.all(imageFiles.map(toFileInput));

    const result = await uploadFixtureVersion(
      { db: getDb(), storage: getStorageClient() },
      {
        manufacturer: String(formData.get("manufacturer") ?? ""),
        name: String(formData.get("name") ?? ""),
        fixtureType: String(formData.get("fixtureType") ?? "") || undefined,
        tags: tags.length ? tags : undefined,
        version: String(formData.get("version") ?? ""),
        changelog: String(formData.get("changelog") ?? "") || undefined,
        depenceCompatibility: compat.length ? compat : undefined,
        modes: modes.length ? modes : undefined,
        dfix: file,
        previewImages: previewImages.length ? previewImages : undefined,
        createdBy,
      },
    );
    if (!result.ok) redirect(`/upload?error=${result.status}`);
    redirect(`/fixtures/${result.fixtureId}`);
  }

  return (
    <main>
      <h1>Upload a fixture</h1>
      <UploadError searchParams={props.searchParams} />
      <form action={upload}>
        <label>Manufacturer<input name="manufacturer" required /></label>
        <label>Fixture name<input name="name" required /></label>
        <label>Fixture type<input name="fixtureType" /></label>
        <label>Tags (comma-separated)<input name="tags" /></label>
        <label>Version<input name="version" required placeholder="1.0.0" /></label>
        <label>Changelog<textarea name="changelog" /></label>
        <label>Depence compatibility (comma-separated)<input name="depenceCompatibility" placeholder="R3, R4" /></label>
        <ModeRows />
        <label>Preview images<input type="file" name="previewImages" accept="image/*" multiple /></label>
        <label>.dfix file<input type="file" name="dfix" required /></label>
        <button type="submit">Upload</button>
      </form>
    </main>
  );
}

async function UploadError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!error) return null;
  const message =
    error === "dfix-required"
      ? "A .dfix file is required."
      : error === "409"
        ? "That exact file has already been uploaded to this fixture."
        : error === "413"
          ? "That .dfix file is too large."
          : error === "404"
            ? "Fixture not found."
            : "Please check the form and try again.";
  return <p role="alert">{message}</p>;
}
