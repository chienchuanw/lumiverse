import { describe, it, expect, afterEach } from "vitest";
import { assertCanWrite, UnauthorizedError } from "../../lib/auth/guard";

const original = process.env.AUTH_ENABLED;
afterEach(() => {
  if (original === undefined) delete process.env.AUTH_ENABLED;
  else process.env.AUTH_ENABLED = original;
});

const session = { user: { id: "u1", email: "a@b.c", role: "member" as const } };

describe("assertCanWrite", () => {
  it("allows writes when auth is disabled, even without a session", () => {
    process.env.AUTH_ENABLED = "false";
    expect(() => assertCanWrite(null)).not.toThrow();
  });

  it("rejects writes when auth is enabled and there is no session", () => {
    process.env.AUTH_ENABLED = "true";
    expect(() => assertCanWrite(null)).toThrow(UnauthorizedError);
  });

  it("allows writes when auth is enabled and a session is present", () => {
    process.env.AUTH_ENABLED = "true";
    expect(() => assertCanWrite(session)).not.toThrow();
  });
});
