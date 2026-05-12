import { getDb } from "@/db";
import { getStorageClient } from "@/core/storage";
import { getVersionDownloadUrl } from "@/lib/fixtures/detail";

export async function GET(request: Request) {
  const versionId = new URL(request.url).searchParams.get("versionId");
  if (!versionId) {
    return Response.json({ error: "versionId is required." }, { status: 400 });
  }
  const url = await getVersionDownloadUrl(getDb(), getStorageClient(), versionId);
  if (!url) {
    return Response.json({ error: "Version not found." }, { status: 404 });
  }
  return Response.json({ url });
}
