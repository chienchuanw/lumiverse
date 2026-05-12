import { describe, it, expect } from "vitest";
import type { StorageClient } from "./types";
import { ObjectNotFoundError } from "./types";

const enc = new TextEncoder();
const dec = new TextDecoder();

/**
 * Behavioural contract every StorageClient implementation must satisfy.
 * Reused by the in-memory tests here and the R2 tests in issue #3.
 */
export function runStorageClientContract(
  name: string,
  makeClient: () => StorageClient,
): void {
  describe(`StorageClient contract: ${name}`, () => {
    it("round-trips bytes through put/get", async () => {
      const client = makeClient();
      await client.put("fixtures/a.dfix", enc.encode("hello"));
      const out = await client.get("fixtures/a.dfix");
      expect(dec.decode(out)).toBe("hello");
    });

    it("overwrites an existing object on put", async () => {
      const client = makeClient();
      await client.put("k", enc.encode("v1"));
      await client.put("k", enc.encode("v2"));
      expect(dec.decode(await client.get("k"))).toBe("v2");
    });

    it("throws ObjectNotFoundError when getting a missing key", async () => {
      const client = makeClient();
      await expect(client.get("missing")).rejects.toBeInstanceOf(
        ObjectNotFoundError,
      );
    });

    it("delete removes an object", async () => {
      const client = makeClient();
      await client.put("k", enc.encode("v"));
      await client.delete("k");
      await expect(client.get("k")).rejects.toBeInstanceOf(ObjectNotFoundError);
    });

    it("delete is a no-op for a missing key", async () => {
      const client = makeClient();
      await expect(client.delete("missing")).resolves.toBeUndefined();
    });

    it("getSignedUrl returns a string containing the key", async () => {
      const client = makeClient();
      await client.put("fixtures/a.dfix", enc.encode("x"));
      const url = await client.getSignedUrl("fixtures/a.dfix", 60);
      expect(typeof url).toBe("string");
      expect(url).toContain("fixtures/a.dfix");
    });
  });
}
