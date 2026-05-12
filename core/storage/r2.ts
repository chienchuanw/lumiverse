import type { PutOptions, StorageClient } from "./types";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  signedUrlTtlSeconds?: number;
}

const NOT_IMPLEMENTED =
  "R2StorageClient is not implemented yet — see issue #3 (Cloudflare R2 StorageClient implementation).";

/**
 * Cloudflare R2 (S3-compatible) StorageClient.
 * Stub only: the real implementation lands in issue #3.
 */
export class R2StorageClient implements StorageClient {
  constructor(private readonly config: R2Config) {}

  async put(_key: string, _body: Uint8Array, _options?: PutOptions): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async get(_key: string): Promise<Uint8Array> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async delete(_key: string): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getSignedUrl(_key: string, _expiresInSeconds?: number): Promise<string> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
