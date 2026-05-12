import { describe, it, expect } from "vitest";
import { validateFixtureMetadata } from "../../core/fixtures";

const valid = {
  manufacturer: "Robe",
  name: "MegaPointe",
  fixtureType: "Moving Head",
  tags: ["beam", "spot"],
  version: "1.0.0",
  changelog: "Initial release",
  modes: [{ name: "Standard", channelCount: 24 }],
};

function fields(errors: { field: string; message: string }[]) {
  return errors.map((e) => e.field);
}

describe("validateFixtureMetadata", () => {
  it("returns no errors for fully valid metadata", () => {
    expect(validateFixtureMetadata(valid)).toEqual([]);
  });

  it("requires a non-empty manufacturer", () => {
    expect(fields(validateFixtureMetadata({ ...valid, manufacturer: "  " }))).toContain(
      "manufacturer",
    );
  });

  it("requires a non-empty name", () => {
    expect(fields(validateFixtureMetadata({ ...valid, name: "" }))).toContain("name");
  });

  it("requires a valid semver version", () => {
    expect(fields(validateFixtureMetadata({ ...valid, version: "1.0" }))).toContain(
      "version",
    );
  });

  it("rejects blank or non-string tags", () => {
    expect(fields(validateFixtureMetadata({ ...valid, tags: ["ok", " "] }))).toContain(
      "tags",
    );
  });

  it("allows omitting optional fields (fixtureType, changelog, modes)", () => {
    expect(
      validateFixtureMetadata({
        manufacturer: "Robe",
        name: "X",
        tags: [],
        version: "0.1.0",
      }),
    ).toEqual([]);
  });

  it("requires each mode to have a non-empty name", () => {
    expect(
      fields(
        validateFixtureMetadata({
          ...valid,
          modes: [{ name: "", channelCount: 10 }],
        }),
      ),
    ).toContain("modes[0].name");
  });

  it("requires channelCount to be a positive integer", () => {
    expect(
      fields(
        validateFixtureMetadata({
          ...valid,
          modes: [{ name: "M", channelCount: 0 }],
        }),
      ),
    ).toContain("modes[0].channelCount");
    expect(
      fields(
        validateFixtureMetadata({
          ...valid,
          modes: [{ name: "M", channelCount: 1.5 }],
        }),
      ),
    ).toContain("modes[0].channelCount");
  });

  it("reports multiple errors at once", () => {
    const errs = validateFixtureMetadata({
      manufacturer: "",
      name: "",
      tags: [],
      version: "bad",
    });
    expect(fields(errs).sort()).toEqual(["manufacturer", "name", "version"]);
  });
});
