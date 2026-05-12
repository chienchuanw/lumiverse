import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { getTestDb, resetTestDb } from "../helpers/db";
import { registerUser, verifyCredentials } from "../../lib/auth/users";
import { assertCanWrite, UnauthorizedError } from "../../lib/auth/guard";
import { POST as registerRoute } from "../../app/api/auth/register/route";

process.env.AUTH_SECRET ??= "test-secret-for-vitest";
await getTestDb();

const feature = await loadFeature("tests/features/auth.feature");

describeFeature(feature, ({ Scenario }) => {
  Scenario("Register a new account and authenticate", ({ Given, When, Then, And }) => {
    let response: Response;

    Given("a clean user table", resetTestDb);

    When(
      `I register with email {string} and password {string}`,
      async (_: unknown, email: string, password: string) => {
        response = await registerRoute(
          new Request("http://test/api/auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password }),
          }),
        );
      },
    );

    Then(`the registration succeeds with status {int}`, (_: unknown, status: number) => {
      expect(response.status).toBe(status);
    });

    And(
      `the credentials {string} / {string} are valid`,
      async (_: unknown, email: string, password: string) => {
        const user = await verifyCredentials(await getTestDb(), { email, password });
        expect(user?.email).toBe(email);
      },
    );
  });

  Scenario(
    "First registered user becomes an admin, the next a member",
    ({ Given, When, Then, And }) => {
      async function roleOf(email: string): Promise<string | undefined> {
        const all = await (await getTestDb()).query.users.findMany();
        return all.find((x) => x.email === email)?.role;
      }

      Given("a clean user table", resetTestDb);

      When(`I register {string} then {string}`, async (_: unknown, a: string, b: string) => {
        const db = await getTestDb();
        await registerUser(db, { email: a, password: "supersecret" });
        await registerUser(db, { email: b, password: "supersecret" });
      });

      Then(`{string} has role {string}`, async (_: unknown, email: string, role: string) => {
        expect(await roleOf(email)).toBe(role);
      });

      And(`{string} has role {string}`, async (_: unknown, email: string, role: string) => {
        expect(await roleOf(email)).toBe(role);
      });
    },
  );

  Scenario(
    "Write access is denied without a session when auth is enabled",
    ({ Given, Then, But }) => {
      const prev = process.env.AUTH_ENABLED;

      Given("authentication is enabled", () => {
        process.env.AUTH_ENABLED = "true";
      });

      Then(`writing without a session is rejected as unauthorized`, () => {
        expect(() => assertCanWrite(null)).toThrow(UnauthorizedError);
      });

      But(`writing without a session is allowed when authentication is disabled`, () => {
        process.env.AUTH_ENABLED = "false";
        expect(() => assertCanWrite(null)).not.toThrow();
        process.env.AUTH_ENABLED = prev;
      });
    },
  );
});
