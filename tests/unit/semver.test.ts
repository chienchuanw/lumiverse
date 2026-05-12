import { describe, it, expect } from "vitest";
import { parseSemver, compareSemver, currentVersion } from "../../core/fixtures";

describe("parseSemver", () => {
  it("parses a plain version", () => {
    expect(parseSemver("1.2.3")).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: undefined,
    });
  });

  it("parses a prerelease version", () => {
    expect(parseSemver("2.0.0-rc.1")).toEqual({
      major: 2,
      minor: 0,
      patch: 0,
      prerelease: "rc.1",
    });
  });

  it("parses multi-digit components", () => {
    expect(parseSemver("10.20.30")).toMatchObject({ major: 10, minor: 20, patch: 30 });
  });

  it("returns null for invalid input", () => {
    for (const bad of ["1", "1.2", "v1.2.3", "1.2.x", "", "1.2.3.4", "a.b.c"]) {
      expect(parseSemver(bad)).toBeNull();
    }
  });
});

describe("compareSemver", () => {
  it("orders by major, then minor, then patch", () => {
    expect(compareSemver("1.0.0", "2.0.0")).toBe(-1);
    expect(compareSemver("1.2.0", "1.10.0")).toBe(-1);
    expect(compareSemver("1.2.3", "1.2.10")).toBe(-1);
    expect(compareSemver("2.0.0", "1.9.9")).toBe(1);
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
  });

  it("treats a prerelease as lower than its release", () => {
    expect(compareSemver("1.0.0-rc.1", "1.0.0")).toBe(-1);
    expect(compareSemver("1.0.0", "1.0.0-rc.1")).toBe(1);
    expect(compareSemver("1.0.0-alpha", "1.0.0-beta")).toBe(-1);
  });
});

describe("currentVersion", () => {
  it("returns the highest version", () => {
    expect(currentVersion(["1.0.0", "2.0.0", "1.5.0"])).toBe("2.0.0");
  });

  it("ignores invalid version strings", () => {
    expect(currentVersion(["1.0.0", "garbage", "1.1.0"])).toBe("1.1.0");
  });

  it("prefers a release over its prerelease", () => {
    expect(currentVersion(["1.0.0-rc.1", "1.0.0"])).toBe("1.0.0");
  });

  it("returns null for an empty or all-invalid list", () => {
    expect(currentVersion([])).toBeNull();
    expect(currentVersion(["x", "y"])).toBeNull();
  });
});
