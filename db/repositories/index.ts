import { eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { Db } from "../index";
import {
  fixtureAssets,
  fixtureModes,
  fixtureVersions,
  fixtures,
  manufacturers,
  users,
} from "../schema";

interface HasId extends PgTable {
  id: PgTable["_"]["columns"][string];
}

export interface Repository<TSelect, TInsert> {
  create(values: TInsert): Promise<TSelect>;
  findById(id: string): Promise<TSelect | null>;
  list(): Promise<TSelect[]>;
  update(id: string, patch: Partial<TInsert>): Promise<TSelect | null>;
  remove(id: string): Promise<void>;
}

function makeRepository<TSelect, TInsert>(
  db: Db,
  table: HasId,
): Repository<TSelect, TInsert> {
  return {
    async create(values) {
      const [row] = await db.insert(table).values(values as never).returning();
      return row as TSelect;
    },
    async findById(id) {
      const [row] = await db
        .select()
        .from(table)
        .where(eq(table.id, id))
        .limit(1);
      return (row as TSelect) ?? null;
    },
    async list() {
      return (await db.select().from(table)) as TSelect[];
    },
    async update(id, patch) {
      const [row] = await db
        .update(table)
        .set(patch as never)
        .where(eq(table.id, id))
        .returning();
      return (row as TSelect) ?? null;
    },
    async remove(id) {
      await db.delete(table).where(eq(table.id, id));
    },
  };
}

export interface Repositories {
  users: Repository<typeof users.$inferSelect, typeof users.$inferInsert>;
  manufacturers: Repository<
    typeof manufacturers.$inferSelect,
    typeof manufacturers.$inferInsert
  >;
  fixtures: Repository<typeof fixtures.$inferSelect, typeof fixtures.$inferInsert>;
  fixtureVersions: Repository<
    typeof fixtureVersions.$inferSelect,
    typeof fixtureVersions.$inferInsert
  >;
  fixtureModes: Repository<
    typeof fixtureModes.$inferSelect,
    typeof fixtureModes.$inferInsert
  >;
  fixtureAssets: Repository<
    typeof fixtureAssets.$inferSelect,
    typeof fixtureAssets.$inferInsert
  >;
}

export function makeRepositories(db: Db): Repositories {
  return {
    users: makeRepository(db, users),
    manufacturers: makeRepository(db, manufacturers),
    fixtures: makeRepository(db, fixtures),
    fixtureVersions: makeRepository(db, fixtureVersions),
    fixtureModes: makeRepository(db, fixtureModes),
    fixtureAssets: makeRepository(db, fixtureAssets),
  };
}
