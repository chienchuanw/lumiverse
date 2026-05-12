import { describe, it, expect } from "vitest";
import { sha256Hex, classifyDuplicate } from "../../core/checksum";
import { Readable } from "node:stream";

const enc = new TextEncoder();

describe("sha256Hex", () => {
  it("hashes a byte array (known vector for 'abc')", async () => {
    const hex = await sha256Hex(enc.encode("abc"));
    expect(hex).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("hashes an empty input", async () => {
    expect(await sha256Hex(enc.encode(""))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("hashes an async iterable of chunks identically to the joined bytes", async () => {
    const whole = await sha256Hex(enc.encode("hello world"));
    const streamed = await sha256Hex(
      Readable.from([enc.encode("hello "), enc.encode("world")]),
    );
    expect(streamed).toBe(whole);
  });
});

describe("classifyDuplicate", () => {
  it("returns 'none' when no existing rows share the checksum", () => {
    expect(classifyDuplicate([], "fix-1")).toBe("none");
  });

  it("returns 'exact' when an existing row on the same fixture has it", () => {
    expect(classifyDuplicate([{ fixtureId: "fix-1" }], "fix-1")).toBe("exact");
  });

  it("returns 'cross-fixture' when only other fixtures have it", () => {
    expect(classifyDuplicate([{ fixtureId: "fix-2" }], "fix-1")).toBe(
      "cross-fixture",
    );
  });

  it("returns 'exact' when the same fixture appears among several matches", () => {
    expect(
      classifyDuplicate(
        [{ fixtureId: "fix-2" }, { fixtureId: "fix-1" }],
        "fix-1",
      ),
    ).toBe("exact");
  });
});
