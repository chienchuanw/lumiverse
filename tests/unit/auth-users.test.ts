import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { getTestDb, resetTestDb, closeTestDb, type TestDb } from "../helpers/db";
import { registerUser, verifyCredentials } from "../../lib/auth/users";
import { hashPassword, verifyPassword } from "../../lib/auth/password";

let db: TestDb;
beforeAll(async () => {
  db = await getTestDb();
});
beforeEach(resetTestDb);
afterAll(closeTestDb);

describe("password hashing", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("hunter2");
    expect(hash).not.toBe("hunter2");
    expect(await verifyPassword("hunter2", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("registerUser", () => {
  it("makes the first registered user an admin", async () => {
    const u = await registerUser(db, { email: "first@x.com", password: "pw123456" });
    expect(u.role).toBe("admin");
  });

  it("makes subsequent users members", async () => {
    await registerUser(db, { email: "first@x.com", password: "pw123456" });
    const u2 = await registerUser(db, { email: "second@x.com", password: "pw123456" });
    expect(u2.role).toBe("member");
  });

  it("does not store the password in plaintext", async () => {
    await registerUser(db, { email: "a@x.com", password: "plaintextpw" });
    const rows = await db.query.users.findMany();
    expect(rows[0].passwordHash).not.toBe("plaintextpw");
  });

  it("rejects a duplicate email", async () => {
    await registerUser(db, { email: "dup@x.com", password: "pw123456" });
    await expect(
      registerUser(db, { email: "dup@x.com", password: "pw123456" }),
    ).rejects.toThrow();
  });

  it("rejects a too-short password", async () => {
    await expect(
      registerUser(db, { email: "a@x.com", password: "short" }),
    ).rejects.toThrow();
  });
});

describe("verifyCredentials", () => {
  it("returns the user for correct credentials", async () => {
    await registerUser(db, { email: "a@x.com", password: "pw123456" });
    const u = await verifyCredentials(db, { email: "a@x.com", password: "pw123456" });
    expect(u?.email).toBe("a@x.com");
  });

  it("returns null for a wrong password", async () => {
    await registerUser(db, { email: "a@x.com", password: "pw123456" });
    expect(
      await verifyCredentials(db, { email: "a@x.com", password: "nope" }),
    ).toBeNull();
  });

  it("returns null for an unknown email", async () => {
    expect(
      await verifyCredentials(db, { email: "ghost@x.com", password: "pw123456" }),
    ).toBeNull();
  });
});
