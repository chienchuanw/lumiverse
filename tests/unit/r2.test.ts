import { describe, it, expect, beforeEach } from "vitest";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  NoSuchKey,
} from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { Readable } from "node:stream";
import { runStorageClientContract } from "../../core/storage/storage.contract";
import { R2StorageClient } from "../../core/storage/r2";
import { ObjectNotFoundError } from "../../core/storage/types";

const config = {
  accountId: "acc123",
  accessKeyId: "key",
  secretAccessKey: "secret",
  bucket: "fixtures-bucket",
};

/** Build an S3Client mock backed by an in-memory object map. */
function mockedClient() {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const store = new Map<string, Buffer>();
  const m = mockClient(client);
  m.on(PutObjectCommand).callsFake((input) => {
    store.set(input.Key, Buffer.from(input.Body));
    return {};
  });
  m.on(GetObjectCommand).callsFake((input) => {
    const bytes = store.get(input.Key);
    if (!bytes) throw new NoSuchKey({ message: "no such key", $metadata: {} });
    return { Body: Readable.from(bytes) };
  });
  m.on(DeleteObjectCommand).callsFake((input) => {
    store.delete(input.Key);
    return {};
  });
  return { client, store, m };
}

runStorageClientContract(
  "R2StorageClient (mocked S3)",
  () => new R2StorageClient(config, mockedClient().client),
);

describe("R2StorageClient", () => {
  let ctx: ReturnType<typeof mockedClient>;
  let client: R2StorageClient;

  beforeEach(() => {
    ctx = mockedClient();
    client = new R2StorageClient(config, ctx.client);
  });

  it("puts objects into the configured bucket with content type", async () => {
    await client.put("fixtures/a.dfix", new TextEncoder().encode("x"), {
      contentType: "application/octet-stream",
    });
    const call = ctx.m.commandCalls(PutObjectCommand)[0];
    expect(call.args[0].input).toMatchObject({
      Bucket: config.bucket,
      Key: "fixtures/a.dfix",
      ContentType: "application/octet-stream",
    });
  });

  it("maps NoSuchKey to ObjectNotFoundError", async () => {
    await expect(client.get("nope")).rejects.toBeInstanceOf(ObjectNotFoundError);
  });

  it("getSignedUrl returns a presigned URL containing the key and bucket", async () => {
    const url = await client.getSignedUrl("fixtures/a.dfix", 120);
    expect(url).toContain("fixtures/a.dfix");
    expect(url).toContain(config.bucket);
    expect(url).toContain("X-Amz-Expires=120");
  });

  it("defaults the signed URL TTL from config when not given", async () => {
    const c = new R2StorageClient(
      { ...config, signedUrlTtlSeconds: 999 },
      mockedClient().client,
    );
    const url = await c.getSignedUrl("k");
    expect(url).toContain("X-Amz-Expires=999");
  });
});
