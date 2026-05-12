export interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | undefined;
}

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

export function parseSemver(value: string): ParsedSemver | null {
  const m = SEMVER_RE.exec(value);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4],
  };
}

function compareIdentifier(a: string, b: string): -1 | 0 | 1 {
  const aNum = /^\d+$/.test(a);
  const bNum = /^\d+$/.test(b);
  if (aNum && bNum) {
    const da = Number(a);
    const db = Number(b);
    return da === db ? 0 : da < db ? -1 : 1;
  }
  // Numeric identifiers always rank lower than alphanumeric ones.
  if (aNum) return -1;
  if (bNum) return 1;
  return a === b ? 0 : a < b ? -1 : 1;
}

function comparePrerelease(a: string | undefined, b: string | undefined): -1 | 0 | 1 {
  if (a === b) return 0;
  // A version without a prerelease ranks higher than one with.
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  const pa = a.split(".");
  const pb = b.split(".");
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (i >= pa.length) return -1; // shorter prerelease ranks lower
    if (i >= pb.length) return 1;
    const c = compareIdentifier(pa[i], pb[i]);
    if (c !== 0) return c;
  }
  return 0;
}

/** Returns -1, 0, or 1. Throws if either string is not valid semver. */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) throw new Error(`Invalid semver: ${!pa ? a : b}`);
  for (const key of ["major", "minor", "patch"] as const) {
    if (pa[key] !== pb[key]) return pa[key] < pb[key] ? -1 : 1;
  }
  return comparePrerelease(pa.prerelease, pb.prerelease);
}

/** Highest valid version in the list; invalid strings are ignored. Null if none valid. */
export function currentVersion(versions: readonly string[]): string | null {
  let best: string | null = null;
  for (const v of versions) {
    if (!parseSemver(v)) continue;
    if (best === null || compareSemver(v, best) > 0) best = v;
  }
  return best;
}
