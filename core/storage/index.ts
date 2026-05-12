import type { StorageClient } from "./types";
import { InMemoryStorageClient } from "./in-memory";
import { R2StorageClient } from "./r2";

export type { StorageClient, PutOptions } from "./types";
export { ObjectNotFoundError } from "./types";
export { InMemoryStorageClient } from "./in-memory";
export { R2StorageClient } from "./r2";

let cachedClient: StorageClient | undefined;

/**
 * Returns the StorageClient for the current environment: an R2-backed client
 * when all R2_* env vars are set, otherwise an in-memory client. Memoized so a
 * single process shares one (in particular, one in-memory store).
 */
export function getStorageClient(): StorageClient {
  if (cachedClient) return cachedClient;
  cachedClient = createStorageClient();
  return cachedClient;
}

/** Clears the memoized client. Intended for tests that toggle env vars. */
export function resetStorageClient(): void {
  cachedClient = undefined;
}

function createStorageClient(): StorageClient {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    const ttl = process.env.R2_SIGNED_URL_TTL;
    return new R2StorageClient({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket,
      signedUrlTtlSeconds: ttl ? Number(ttl) : undefined,
    });
  }

  return new InMemoryStorageClient();
}
