import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runStorageClientContract } from "../../core/storage/storage.contract";
import { InMemoryStorageClient } from "../../core/storage/in-memory";
import { getStorageClient, resetStorageClient } from "../../core/storage";
import { R2StorageClient } from "../../core/storage/r2";

runStorageClientContract("InMemoryStorageClient", () => new InMemoryStorageClient());

describe("getStorageClient", () => {
  const r2Vars = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
  ] as const;
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(r2Vars.map((k) => [k, process.env[k]]));
    for (const k of r2Vars) delete process.env[k];
    resetStorageClient();
  });

  afterEach(() => {
    for (const k of r2Vars) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    resetStorageClient();
  });

  it("returns an in-memory client when R2 env vars are absent", () => {
    expect(getStorageClient()).toBeInstanceOf(InMemoryStorageClient);
  });

  it("returns an R2 client when all R2 env vars are present", () => {
    process.env.R2_ACCOUNT_ID = "acc";
    process.env.R2_ACCESS_KEY_ID = "key";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    process.env.R2_BUCKET = "bucket";
    expect(getStorageClient()).toBeInstanceOf(R2StorageClient);
  });
});
