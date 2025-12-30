CREATE TYPE "public"."avatar_status" AS ENUM('generating', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."scheduled_tweet_status" AS ENUM('pending', 'processing', 'posted', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "avatar_generations" (
	"id" text PRIMARY KEY NOT NULL,
	"avatar_id" text NOT NULL,
	"image_url" text NOT NULL,
	"prompt_used" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avatars" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"current_image_url" text,
	"base_model" text DEFAULT 'nano-banana' NOT NULL,
	"prompt_history" jsonb DEFAULT '[]'::jsonb,
	"status" "avatar_status" DEFAULT 'ready' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"status" text NOT NULL,
	"updated" text,
	"owner" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"tags" text[],
	"accent" text NOT NULL,
	"script" text NOT NULL,
	"shots" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_tweets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"twitter_account_id" integer NOT NULL,
	"text" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"time_zone" text DEFAULT 'America/Chicago' NOT NULL,
	"status" "scheduled_tweet_status" DEFAULT 'pending' NOT NULL,
	"tweet_id" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "twitter_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"twitter_user_id" text NOT NULL,
	"screen_name" text,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"storage_path" text NOT NULL,
	"original_name" text,
	"mime_type" text NOT NULL,
	"is_avatar_reference" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "avatar_generations" ADD CONSTRAINT "avatar_generations_avatar_id_avatars_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."avatars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_tweets" ADD CONSTRAINT "scheduled_tweets_twitter_account_id_twitter_accounts_id_fk" FOREIGN KEY ("twitter_account_id") REFERENCES "public"."twitter_accounts"("id") ON DELETE cascade ON UPDATE no action;