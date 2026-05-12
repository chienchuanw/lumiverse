import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../../db/schema";

export type TestDb = PostgresJsDatabase<typeof schema>;

const TABLES = [
  "fixture_assets",
  "fixture_modes",
  "fixture_versions",
  "fixtures",
  "manufacturers",
  "users",
] as const;

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/lumiverse_test";

let client: ReturnType<typeof postgres> | undefined;
let db: TestDb | undefined;
let migrated = false;

/** Returns a migrated test database, running migrations once per process. */
export async function getTestDb(): Promise<TestDb> {
  if (!db) {
    client = postgres(connectionString, { max: 1 });
    db = drizzle(client, { schema });
  }
  if (!migrated) {
    await migrate(db, { migrationsFolder: "db/migrations" });
    migrated = true;
  }
  return db;
}

/** Removes all rows from every table. Call in beforeEach. */
export async function resetTestDb(): Promise<void> {
  const d = await getTestDb();
  await d.execute(
    sql.raw(`truncate table ${TABLES.join(", ")} restart identity cascade`),
  );
}

export async function closeTestDb(): Promise<void> {
  await client?.end();
  client = undefined;
  db = undefined;
  migrated = false;
}
