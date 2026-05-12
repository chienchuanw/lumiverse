import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  NoSuchKey,
} from "@aws-sdk/client-s3";
import { getSignedUrl as presign } from "@aws-sdk/s3-request-presigner";
import type { PutOptions, StorageClient } from "./types";
import { ObjectNotFoundError } from "./types";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Default TTL (seconds) for getSignedUrl. Defaults to 600. */
  signedUrlTtlSeconds?: number;
}

const DEFAULT_TTL_SECONDS = 600;

async function streamToBytes(body: unknown): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  if (
    body &&
    typeof (body as { transformToByteArray?: unknown }).transformToByteArray ===
      "function"
  ) {
    return (body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray();
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return new Uint8Array(Buffer.concat(chunks));
}

/** Cloudflare R2 (S3-compatible) StorageClient. */
export class R2StorageClient implements StorageClient {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly ttl: number;

  constructor(config: R2Config, client?: S3Client) {
    this.bucket = config.bucket;
    this.ttl = config.signedUrlTtlSeconds ?? DEFAULT_TTL_SECONDS;
    this.client =
      client ??
      new S3Client({
        region: "auto",
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
  }

  async put(key: string, body: Uint8Array, options?: PutOptions): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: options?.contentType,
      }),
    );
  }

  async get(key: string): Promise<Uint8Array> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return await streamToBytes(res.Body);
    } catch (err) {
      if (err instanceof NoSuchKey || (err as { name?: string })?.name === "NoSuchKey") {
        throw new ObjectNotFoundError(key);
      }
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async getSignedUrl(key: string, expiresInSeconds?: number): Promise<string> {
    return presign(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds ?? this.ttl },
    );
  }
}
