import { describe, it, expect, afterEach } from "vitest";
import { isAuthEnabled } from "../../lib/auth/config";

const original = process.env.AUTH_ENABLED;
afterEach(() => {
  if (original === undefined) delete process.env.AUTH_ENABLED;
  else process.env.AUTH_ENABLED = original;
});

describe("isAuthEnabled", () => {
  it("is false when unset", () => {
    delete process.env.AUTH_ENABLED;
    expect(isAuthEnabled()).toBe(false);
  });

  it("is false for 'false'", () => {
    process.env.AUTH_ENABLED = "false";
    expect(isAuthEnabled()).toBe(false);
  });

  it("is true for 'true' (case-insensitive, trimmed)", () => {
    process.env.AUTH_ENABLED = " TRUE ";
    expect(isAuthEnabled()).toBe(true);
  });

  it("is false for any other value", () => {
    process.env.AUTH_ENABLED = "yes";
    expect(isAuthEnabled()).toBe(false);
  });
});
