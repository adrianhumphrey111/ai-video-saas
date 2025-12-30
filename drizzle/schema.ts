import { pgTable, text, integer, jsonb, timestamp, foreignKey, serial, unique, uuid, boolean, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const assetKind = pgEnum("asset_kind", ['image', 'video', 'audio', 'other'])
export const avatarStatus = pgEnum("avatar_status", ['generating', 'ready', 'failed'])
export const elementKind = pgEnum("element_kind", ['character', 'object', 'other'])
export const elementStatus = pgEnum("element_status", ['draft', 'generating', 'ready', 'failed', 'archived'])
export const elementVersionStatus = pgEnum("element_version_status", ['draft', 'processing', 'ready', 'failed'])
export const scheduledTweetStatus = pgEnum("scheduled_tweet_status", ['pending', 'processing', 'posted', 'failed', 'cancelled'])


export const projects = pgTable("projects", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	summary: text().notNull(),
	status: text().notNull(),
	updated: text(),
	owner: text().notNull(),
	progress: integer().default(0).notNull(),
	tags: text().array(),
	accent: text().notNull(),
	script: text().notNull(),
	shots: jsonb().default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const scheduledTweets = pgTable("scheduled_tweets", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	twitterAccountId: integer("twitter_account_id").notNull(),
	text: text().notNull(),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }).notNull(),
	timeZone: text("time_zone").default('America/Chicago').notNull(),
	status: scheduledTweetStatus().default('pending').notNull(),
	tweetId: text("tweet_id"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.twitterAccountId],
			foreignColumns: [twitterAccounts.id],
			name: "scheduled_tweets_twitter_account_id_twitter_accounts_id_fk"
		}).onDelete("cascade"),
]);

export const waitlist = pgTable("waitlist", {
	id: serial().primaryKey().notNull(),
	email: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("waitlist_email_unique").on(table.email),
]);

export const twitterAccounts = pgTable("twitter_accounts", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	twitterUserId: text("twitter_user_id").notNull(),
	screenName: text("screen_name"),
	accessToken: text("access_token").notNull(),
	refreshToken: text("refresh_token").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const scenes = pgTable("scenes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	description: text(),
	status: text().default('draft').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const sceneElements = pgTable("scene_elements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sceneId: uuid("scene_id").notNull(),
	elementVersionId: uuid("element_version_id").notNull(),
	placement: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.elementVersionId],
			foreignColumns: [elementVersions.id],
			name: "scene_elements_element_version_id_element_versions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sceneId],
			foreignColumns: [scenes.id],
			name: "scene_elements_scene_id_scenes_id_fk"
		}).onDelete("cascade"),
]);

export const elements = pgTable("elements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	kind: elementKind().notNull(),
	name: text().notNull(),
	summary: text(),
	status: elementStatus().default('draft').notNull(),
	latestVersionId: uuid("latest_version_id"),
	thumbnailUrl: text("thumbnail_url"),
	tags: text().array(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const elementJobs = pgTable("element_jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	elementId: uuid("element_id").notNull(),
	elementVersionId: uuid("element_version_id"),
	status: text().default('queued').notNull(),
	provider: text(),
	request: jsonb(),
	response: jsonb(),
	error: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.elementId],
			foreignColumns: [elements.id],
			name: "element_jobs_element_id_elements_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.elementVersionId],
			foreignColumns: [elementVersions.id],
			name: "element_jobs_element_version_id_element_versions_id_fk"
		}).onDelete("set null"),
]);

export const elementVersions = pgTable("element_versions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	elementId: uuid("element_id").notNull(),
	versionNumber: integer("version_number").notNull(),
	parentVersionId: uuid("parent_version_id"),
	status: elementVersionStatus().default('ready').notNull(),
	source: text().default('generate').notNull(),
	prompt: text(),
	diffInstruction: text("diff_instruction"),
	attributes: jsonb().default({}),
	assetId: uuid("asset_id"),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.assetId],
			foreignColumns: [assets.id],
			name: "element_versions_asset_id_assets_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.elementId],
			foreignColumns: [elements.id],
			name: "element_versions_element_id_elements_id_fk"
		}).onDelete("cascade"),
]);

export const assets = pgTable("assets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	storagePath: text("storage_path").notNull(),
	publicUrl: text("public_url").notNull(),
	mimeType: text("mime_type").notNull(),
	sizeBytes: integer("size_bytes"),
	width: integer(),
	height: integer(),
	durationMs: integer("duration_ms"),
	kind: assetKind().default('image').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const userUploads = pgTable("user_uploads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	storagePath: text("storage_path").notNull(),
	originalName: text("original_name"),
	mimeType: text("mime_type").notNull(),
	isAvatarReference: boolean("is_avatar_reference").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const avatars = pgTable("avatars", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	currentImageUrl: text("current_image_url"),
	baseModel: text("base_model").default('nano-banana').notNull(),
	promptHistory: jsonb("prompt_history").default([]),
	status: avatarStatus().default('ready').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const avatarGenerations = pgTable("avatar_generations", {
	id: text().primaryKey().notNull(),
	avatarId: text("avatar_id").notNull(),
	imageUrl: text("image_url").notNull(),
	promptUsed: text("prompt_used").notNull(),
	settings: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.avatarId],
			foreignColumns: [avatars.id],
			name: "avatar_generations_avatar_id_avatars_id_fk"
		}).onDelete("cascade"),
]);
