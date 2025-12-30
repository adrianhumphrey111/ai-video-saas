CREATE TYPE "public"."video_aspect_ratio" AS ENUM('16:9', '9:16');--> statement-breakpoint
CREATE TYPE "public"."video_generation_mode" AS ENUM('auto', 'text_to_video', 'image_to_video', 'references_to_video', 'frame_interpolation', 'video_extension', 'inpaint');--> statement-breakpoint
CREATE TYPE "public"."video_job_status" AS ENUM('queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."video_resolution" AS ENUM('720p', '1080p');--> statement-breakpoint
CREATE TABLE "video_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"video_version_id" uuid NOT NULL,
	"provider" text DEFAULT 'vertex-veo' NOT NULL,
	"operation_name" text NOT NULL,
	"status" "video_job_status" DEFAULT 'queued' NOT NULL,
	"request" jsonb DEFAULT '{}'::jsonb,
	"response" jsonb DEFAULT '{}'::jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"video_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"negative_prompt" text,
	"mode" "video_generation_mode" DEFAULT 'auto' NOT NULL,
	"aspect_ratio" "video_aspect_ratio" DEFAULT '16:9' NOT NULL,
	"duration_seconds" integer DEFAULT 8 NOT NULL,
	"resolution" "video_resolution" DEFAULT '720p' NOT NULL,
	"generate_audio" boolean DEFAULT true NOT NULL,
	"sample_count" integer DEFAULT 1 NOT NULL,
	"reference_asset_ids" jsonb DEFAULT '[]'::jsonb,
	"reference_image_ids" jsonb DEFAULT '[]'::jsonb,
	"request" jsonb DEFAULT '{}'::jsonb,
	"output_gcs_uris" jsonb DEFAULT '[]'::jsonb,
	"output_mime_types" jsonb DEFAULT '[]'::jsonb,
	"status" "video_job_status" DEFAULT 'queued' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "gcs_uri" text;--> statement-breakpoint
ALTER TABLE "user_uploads" ADD COLUMN "gcs_uri" text;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_video_version_id_video_versions_id_fk" FOREIGN KEY ("video_version_id") REFERENCES "public"."video_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_versions" ADD CONSTRAINT "video_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_versions" ADD CONSTRAINT "video_versions_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;