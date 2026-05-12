import type { PutOptions, StorageClient } from "./types";
import { ObjectNotFoundError } from "./types";

/** In-memory StorageClient for local development and tests. Not persistent. */
export class InMemoryStorageClient implements StorageClient {
  private readonly objects = new Map<string, Uint8Array>();

  async put(key: string, body: Uint8Array, _options?: PutOptions): Promise<void> {
    this.objects.set(key, body.slice());
  }

  async get(key: string): Promise<Uint8Array> {
    const value = this.objects.get(key);
    if (value === undefined) throw new ObjectNotFoundError(key);
    return value.slice();
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async getSignedUrl(key: string, expiresInSeconds = 600): Promise<string> {
    return `memory://${encodeURI(key)}?expires=${expiresInSeconds}`;
  }

  /** All stored keys. Useful for assertions in tests. */
  keys(): string[] {
    return [...this.objects.keys()];
  }
}
