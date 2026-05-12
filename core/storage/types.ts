export interface PutOptions {
  contentType?: string;
}

export interface StorageClient {
  /** Store bytes under `key`. Overwrites any existing object. */
  put(key: string, body: Uint8Array, options?: PutOptions): Promise<void>;
  /** Retrieve bytes for `key`. Throws if the key does not exist. */
  get(key: string): Promise<Uint8Array>;
  /** Remove `key`. No-op if the key does not exist. */
  delete(key: string): Promise<void>;
  /** Return a time-limited URL that grants read access to `key`. */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export class ObjectNotFoundError extends Error {
  constructor(key: string) {
    super(`Object not found: ${key}`);
    this.name = "ObjectNotFoundError";
  }
}
