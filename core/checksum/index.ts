import { createHash } from "node:crypto";

export type DuplicateKind = "exact" | "cross-fixture" | "none";

/** SHA-256 of a byte array or an (async) iterable of byte chunks, as lowercase hex. */
export async function sha256Hex(
  data: Uint8Array | Iterable<Uint8Array> | AsyncIterable<Uint8Array>,
): Promise<string> {
  const hash = createHash("sha256");
  if (data instanceof Uint8Array) {
    hash.update(data);
  } else {
    for await (const chunk of data as AsyncIterable<Uint8Array>) {
      hash.update(chunk);
    }
  }
  return hash.digest("hex");
}

/**
 * Classify a candidate upload against the rows that already carry the same
 * checksum: "exact" if one belongs to the target fixture, "cross-fixture" if
 * only other fixtures have it, "none" if there are no matches.
 */
export function classifyDuplicate(
  matches: ReadonlyArray<{ fixtureId: string }>,
  targetFixtureId: string,
): DuplicateKind {
  if (matches.length === 0) return "none";
  return matches.some((m) => m.fixtureId === targetFixtureId)
    ? "exact"
    : "cross-fixture";
}
