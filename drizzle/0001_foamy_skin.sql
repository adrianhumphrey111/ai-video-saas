CREATE TYPE "public"."asset_kind" AS ENUM('image', 'video', 'audio', 'other');--> statement-breakpoint
CREATE TYPE "public"."element_kind" AS ENUM('character', 'object', 'other');--> statement-breakpoint
CREATE TYPE "public"."element_status" AS ENUM('draft', 'generating', 'ready', 'failed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."element_version_status" AS ENUM('draft', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"storage_path" text NOT NULL,
	"public_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer,
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"kind" "asset_kind" DEFAULT 'image' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "element_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"element_id" uuid NOT NULL,
	"element_version_id" uuid,
	"status" text DEFAULT 'queued' NOT NULL,
	"provider" text,
	"request" jsonb,
	"response" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "element_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"element_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"parent_version_id" uuid,
	"status" "element_version_status" DEFAULT 'ready' NOT NULL,
	"source" text DEFAULT 'generate' NOT NULL,
	"prompt" text,
	"diff_instruction" text,
	"attributes" jsonb DEFAULT '{}'::jsonb,
	"asset_id" uuid,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" "element_kind" NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"status" "element_status" DEFAULT 'draft' NOT NULL,
	"latest_version_id" uuid,
	"thumbnail_url" text,
	"tags" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_elements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"element_version_id" uuid NOT NULL,
	"placement" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "element_jobs" ADD CONSTRAINT "element_jobs_element_id_elements_id_fk" FOREIGN KEY ("element_id") REFERENCES "public"."elements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "element_jobs" ADD CONSTRAINT "element_jobs_element_version_id_element_versions_id_fk" FOREIGN KEY ("element_version_id") REFERENCES "public"."element_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "element_versions" ADD CONSTRAINT "element_versions_element_id_elements_id_fk" FOREIGN KEY ("element_id") REFERENCES "public"."elements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "element_versions" ADD CONSTRAINT "element_versions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_elements" ADD CONSTRAINT "scene_elements_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_elements" ADD CONSTRAINT "scene_elements_element_version_id_element_versions_id_fk" FOREIGN KEY ("element_version_id") REFERENCES "public"."element_versions"("id") ON DELETE cascade ON UPDATE no action;