import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "member"]);
export const processingStatus = pgEnum("processing_status", [
  "ready",
  "pending",
  "failed",
]);
export const assetKind = pgEnum("asset_kind", ["preview_image", "doc"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const manufacturers = pgTable("manufacturers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fixtures = pgTable(
  "fixtures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    manufacturerId: uuid("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    fixtureType: text("fixture_type"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("fixtures_manufacturer_slug_unique").on(t.manufacturerId, t.slug),
    index("fixtures_manufacturer_idx").on(t.manufacturerId),
  ],
);

export const fixtureVersions = pgTable(
  "fixture_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fixtureId: uuid("fixture_id")
      .notNull()
      .references(() => fixtures.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    changelog: text("changelog"),
    dfixFileKey: text("dfix_file_key").notNull(),
    dfixChecksum: text("dfix_checksum").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    depenceCompatibility: text("depence_compatibility")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    processingStatus: processingStatus("processing_status")
      .notNull()
      .default("ready"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("fixture_versions_fixture_version_unique").on(t.fixtureId, t.version),
    unique("fixture_versions_fixture_checksum_unique").on(
      t.fixtureId,
      t.dfixChecksum,
    ),
    index("fixture_versions_fixture_idx").on(t.fixtureId),
  ],
);

export const fixtureModes = pgTable(
  "fixture_modes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fixtureVersionId: uuid("fixture_version_id")
      .notNull()
      .references(() => fixtureVersions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    channelCount: integer("channel_count").notNull(),
  },
  (t) => [index("fixture_modes_version_idx").on(t.fixtureVersionId)],
);

export const fixtureAssets = pgTable(
  "fixture_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fixtureVersionId: uuid("fixture_version_id")
      .notNull()
      .references(() => fixtureVersions.id, { onDelete: "cascade" }),
    kind: assetKind("kind").notNull(),
    fileKey: text("file_key").notNull(),
    fileName: text("file_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("fixture_assets_version_idx").on(t.fixtureVersionId)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Manufacturer = typeof manufacturers.$inferSelect;
export type NewManufacturer = typeof manufacturers.$inferInsert;
export type Fixture = typeof fixtures.$inferSelect;
export type NewFixture = typeof fixtures.$inferInsert;
export type FixtureVersion = typeof fixtureVersions.$inferSelect;
export type NewFixtureVersion = typeof fixtureVersions.$inferInsert;
export type FixtureMode = typeof fixtureModes.$inferSelect;
export type NewFixtureMode = typeof fixtureModes.$inferInsert;
export type FixtureAsset = typeof fixtureAssets.$inferSelect;
export type NewFixtureAsset = typeof fixtureAssets.$inferInsert;
