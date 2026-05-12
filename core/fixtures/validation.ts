import { parseSemver } from "./semver";

export interface FixtureModeInput {
  name?: unknown;
  channelCount?: unknown;
}

export interface FixtureMetadataInput {
  manufacturer?: unknown;
  name?: unknown;
  fixtureType?: unknown;
  description?: unknown;
  tags?: unknown;
  version?: unknown;
  changelog?: unknown;
  modes?: unknown;
}

export interface FieldError {
  field: string;
  message: string;
}

const MAX_CHANNELS = 512;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function validateFixtureMetadata(input: FixtureMetadataInput): FieldError[] {
  const errors: FieldError[] = [];

  if (!isNonEmptyString(input.manufacturer)) {
    errors.push({ field: "manufacturer", message: "Manufacturer is required." });
  }
  if (!isNonEmptyString(input.name)) {
    errors.push({ field: "name", message: "Fixture name is required." });
  }
  if (input.fixtureType !== undefined && typeof input.fixtureType !== "string") {
    errors.push({ field: "fixtureType", message: "Fixture type must be a string." });
  }
  if (typeof input.version !== "string" || parseSemver(input.version) === null) {
    errors.push({ field: "version", message: "Version must be valid semver (e.g. 1.0.0)." });
  }
  if (input.changelog !== undefined && typeof input.changelog !== "string") {
    errors.push({ field: "changelog", message: "Changelog must be a string." });
  }

  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags) || input.tags.some((t) => !isNonEmptyString(t))) {
      errors.push({ field: "tags", message: "Tags must be an array of non-empty strings." });
    }
  }

  if (input.modes !== undefined) {
    if (!Array.isArray(input.modes)) {
      errors.push({ field: "modes", message: "Modes must be an array." });
    } else {
      input.modes.forEach((mode: FixtureModeInput, i) => {
        if (!isNonEmptyString(mode?.name)) {
          errors.push({ field: `modes[${i}].name`, message: "Mode name is required." });
        }
        const cc = mode?.channelCount;
        if (
          typeof cc !== "number" ||
          !Number.isInteger(cc) ||
          cc < 1 ||
          cc > MAX_CHANNELS
        ) {
          errors.push({
            field: `modes[${i}].channelCount`,
            message: `Channel count must be an integer between 1 and ${MAX_CHANNELS}.`,
          });
        }
      });
    }
  }

  return errors;
}
