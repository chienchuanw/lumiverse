CREATE TYPE "public"."asset_kind" AS ENUM('preview_image', 'doc');--> statement-breakpoint
CREATE TYPE "public"."processing_status" AS ENUM('ready', 'pending', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TABLE "fixture_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fixture_version_id" uuid NOT NULL,
	"kind" "asset_kind" NOT NULL,
	"file_key" text NOT NULL,
	"file_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixture_modes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fixture_version_id" uuid NOT NULL,
	"name" text NOT NULL,
	"channel_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixture_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fixture_id" uuid NOT NULL,
	"version" text NOT NULL,
	"changelog" text,
	"dfix_file_key" text NOT NULL,
	"dfix_checksum" text NOT NULL,
	"file_size" bigint NOT NULL,
	"depence_compatibility" text[] DEFAULT '{}'::text[] NOT NULL,
	"processing_status" "processing_status" DEFAULT 'ready' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fixture_versions_fixture_version_unique" UNIQUE("fixture_id","version"),
	CONSTRAINT "fixture_versions_fixture_checksum_unique" UNIQUE("fixture_id","dfix_checksum")
);
--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manufacturer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"fixture_type" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fixtures_manufacturer_slug_unique" UNIQUE("manufacturer_id","slug")
);
--> statement-breakpoint
CREATE TABLE "manufacturers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manufacturers_name_unique" UNIQUE("name"),
	CONSTRAINT "manufacturers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "fixture_assets" ADD CONSTRAINT "fixture_assets_fixture_version_id_fixture_versions_id_fk" FOREIGN KEY ("fixture_version_id") REFERENCES "public"."fixture_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixture_modes" ADD CONSTRAINT "fixture_modes_fixture_version_id_fixture_versions_id_fk" FOREIGN KEY ("fixture_version_id") REFERENCES "public"."fixture_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixture_versions" ADD CONSTRAINT "fixture_versions_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixture_versions" ADD CONSTRAINT "fixture_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fixture_assets_version_idx" ON "fixture_assets" USING btree ("fixture_version_id");--> statement-breakpoint
CREATE INDEX "fixture_modes_version_idx" ON "fixture_modes" USING btree ("fixture_version_id");--> statement-breakpoint
CREATE INDEX "fixture_versions_fixture_idx" ON "fixture_versions" USING btree ("fixture_id");--> statement-breakpoint
CREATE INDEX "fixtures_manufacturer_idx" ON "fixtures" USING btree ("manufacturer_id");