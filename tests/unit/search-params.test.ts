import { describe, it, expect } from "vitest";
import { parseSearchParams, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../../core/search";

const parse = (qs: string) => parseSearchParams(new URLSearchParams(qs));

describe("parseSearchParams", () => {
  it("applies defaults for an empty query string", () => {
    expect(parse("")).toEqual({
      q: undefined,
      manufacturer: undefined,
      fixtureType: undefined,
      channelMin: undefined,
      channelMax: undefined,
      compatibility: undefined,
      tags: undefined,
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it("trims string params and ignores blanks", () => {
    expect(parse("q=%20%20").q).toBeUndefined();
    expect(parse("q=%20mega%20").q).toBe("mega");
  });

  it("parses channel bounds as non-negative integers", () => {
    expect(parse("channelMin=8&channelMax=32")).toMatchObject({ channelMin: 8, channelMax: 32 });
    expect(parse("channelMin=-5").channelMin).toBe(0);
    expect(parse("channelMin=abc").channelMin).toBeUndefined();
  });

  it("collects tags and compatibility from repeated and comma-separated values", () => {
    expect(parse("tags=beam&tags=spot,wash").tags).toEqual(["beam", "spot", "wash"]);
    expect(parse("compatibility=R3,R4").compatibility).toEqual(["R3", "R4"]);
    expect(parse("tags=,, ").tags).toBeUndefined();
  });

  it("clamps page and pageSize", () => {
    expect(parse("page=0").page).toBe(1);
    expect(parse("page=3").page).toBe(3);
    expect(parse("pageSize=999").pageSize).toBe(MAX_PAGE_SIZE);
    expect(parse("pageSize=0").pageSize).toBe(1);
  });
});
