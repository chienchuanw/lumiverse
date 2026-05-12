import { describe, it, expect } from "vitest";
import { slugify } from "../../core/fixtures";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugify("Robe MegaPointe")).toBe("robe-megapointe");
  });

  it("drops punctuation and collapses separators", () => {
    expect(slugify("Clay Paky! Sharpy_Plus")).toBe("clay-paky-sharpy-plus");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("  --Foo--  ")).toBe("foo");
  });

  it("strips diacritics", () => {
    expect(slugify("Über Lights")).toBe("uber-lights");
  });

  it("keeps digits", () => {
    expect(slugify("iFORTE LTX 56CH")).toBe("iforte-ltx-56ch");
  });

  it("returns an empty string for empty or symbol-only input", () => {
    expect(slugify("")).toBe("");
    expect(slugify("!!!")).toBe("");
  });
});
