import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scheduledTweetStatusEnum = pgEnum("scheduled_tweet_status", [
  "pending",
  "processing",
  "posted",
  "failed",
  "cancelled",
]);

export const twitterAccounts = pgTable("twitter_accounts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  twitterUserId: text("twitter_user_id").notNull(),
  screenName: text("screen_name"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const scheduledTweets = pgTable("scheduled_tweets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  twitterAccountId: integer("twitter_account_id")
    .notNull()
    .references(() => twitterAccounts.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "date" })
    .notNull(),
  timeZone: text("time_zone").default("America/Chicago").notNull(),
  status: scheduledTweetStatusEnum("status").default("pending").notNull(),
  tweetId: text("tweet_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(), // Using text/uuid for manually generated IDs or uuid() if using pg-core uuid
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  summary: text("summary").notNull(),
  status: text("status").notNull(), // "In progress", "Review", "Draft"
  updated: text("updated"), // Store display string or use timestamp and format. Mock uses string "2h ago". Sticking to timestamp for real data is better, but maybe just string for now to match mock easily? Let's use timestamp and format in UI.
  owner: text("owner").notNull(),
  progress: integer("progress").default(0).notNull(),
  tags: text("tags").array(),
  accent: text("accent").notNull(),
  script: text("script").notNull(),
  shots: jsonb("shots").$type<{ title: string; duration: string; type: string }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectsRelations = relations(projects, ({ one }) => ({
  // Add relations if we have a users table, but schema doesn't show one explicitly yet (auth is likely separate)
}));

export const scheduledTweetsRelations = relations(
  scheduledTweets,
  ({ one }) => ({
    twitterAccount: one(twitterAccounts, {
      fields: [scheduledTweets.twitterAccountId],
      references: [twitterAccounts.id],
    }),
  })
);

export const twitterAccountsRelations = relations(twitterAccounts, ({ many }) => ({
  scheduledTweets: many(scheduledTweets),
}));

export type TwitterAccount = typeof twitterAccounts.$inferSelect;
export type ScheduledTweet = typeof scheduledTweets.$inferSelect;
export type Project = typeof projects.$inferSelect;

export const avatarStatusEnum = pgEnum("avatar_status", [
  "generating",
  "ready",
  "failed",
]);

export const elementKindEnum = pgEnum("element_kind", [
  "character",
  "object",
  "other",
]);

export const elementStatusEnum = pgEnum("element_status", [
  "draft",
  "generating",
  "ready",
  "failed",
  "archived",
]);

export const elementVersionStatusEnum = pgEnum("element_version_status", [
  "draft",
  "processing",
  "ready",
  "failed",
]);

export const assetKindEnum = pgEnum("asset_kind", [
  "image",
  "video",
  "audio",
  "other",
]);

export const videoAspectRatioEnum = pgEnum("video_aspect_ratio", ["16:9", "9:16"]);

export const videoResolutionEnum = pgEnum("video_resolution", ["720p", "1080p"]);

export const videoGenerationModeEnum = pgEnum("video_generation_mode", [
  "auto",
  "text_to_video",
  "image_to_video",
  "references_to_video",
  "frame_interpolation",
  "video_extension",
  "inpaint",
]);

export const videoJobStatusEnum = pgEnum("video_job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
]);

export const avatars = pgTable("avatars", {
  id: text("id").primaryKey(), // uuid
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  currentImageUrl: text("current_image_url"),
  baseModel: text("base_model").notNull().default("nano-banana"),
  promptHistory: jsonb("prompt_history").$type<{ role: string; content: string }[]>().default([]),
  status: avatarStatusEnum("status").default("ready").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const avatarGenerations = pgTable("avatar_generations", {
  id: text("id").primaryKey(), // uuid
  avatarId: text("avatar_id")
    .notNull()
    .references(() => avatars.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  promptUsed: text("prompt_used").notNull(),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const avatarsRelations = relations(avatars, ({ many }) => ({
  generations: many(avatarGenerations),
}));

export const avatarGenerationsRelations = relations(avatarGenerations, ({ one }) => ({
  avatar: one(avatars, {
    fields: [avatarGenerations.avatarId],
    references: [avatars.id],
  }),
}));

export type Avatar = typeof avatars.$inferSelect;
export type AvatarGeneration = typeof avatarGenerations.$inferSelect;

export const userUploads = pgTable("user_uploads", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  storagePath: text("storage_path").notNull(),
  gcsUri: text("gcs_uri"),
  originalName: text("original_name"),
  mimeType: text("mime_type").notNull(),
  isAvatarReference: boolean("is_avatar_reference").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserUpload = typeof userUploads.$inferSelect;

export const assets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  storagePath: text("storage_path").notNull(),
  gcsUri: text("gcs_uri"),
  publicUrl: text("public_url").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes"),
  width: integer("width"),
  height: integer("height"),
  durationMs: integer("duration_ms"),
  kind: assetKindEnum("kind").default("image").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const elements = pgTable("elements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  kind: elementKindEnum("kind").notNull(),
  name: text("name").notNull(),
  summary: text("summary"),
  status: elementStatusEnum("status").default("draft").notNull(),
  latestVersionId: uuid("latest_version_id"), // intentionally not FK to avoid circular initialization
  thumbnailUrl: text("thumbnail_url"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const elementVersions = pgTable("element_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  elementId: uuid("element_id")
    .notNull()
    .references(() => elements.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  parentVersionId: uuid("parent_version_id"),
  status: elementVersionStatusEnum("status").default("ready").notNull(),
  source: text("source").default("generate").notNull(), // upload|generate|edit|import
  prompt: text("prompt"),
  diffInstruction: text("diff_instruction"),
  attributes: jsonb("attributes").$type<Record<string, any>>().default({}),
  assetId: uuid("asset_id").references(() => assets.id, { onDelete: "set null" }),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const elementJobs = pgTable("element_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  elementId: uuid("element_id")
    .notNull()
    .references(() => elements.id, { onDelete: "cascade" }),
  elementVersionId: uuid("element_version_id").references(
    () => elementVersions.id,
    { onDelete: "set null" },
  ),
  status: text("status").default("queued").notNull(), // queued|running|succeeded|failed
  provider: text("provider"),
  request: jsonb("request"),
  response: jsonb("response"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scenes = pgTable("scenes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const videos = pgTable("videos", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const videoVersions = pgTable("video_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  videoId: uuid("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  negativePrompt: text("negative_prompt"),
  mode: videoGenerationModeEnum("mode").default("auto").notNull(),
  aspectRatio: videoAspectRatioEnum("aspect_ratio").default("16:9").notNull(),
  durationSeconds: integer("duration_seconds").default(8).notNull(),
  resolution: videoResolutionEnum("resolution").default("720p").notNull(),
  generateAudio: boolean("generate_audio").default(true).notNull(),
  sampleCount: integer("sample_count").default(1).notNull(),
  referenceAssetIds: jsonb("reference_asset_ids").$type<string[]>().default([]),
  referenceImageIds: jsonb("reference_image_ids").$type<string[]>().default([]),
  request: jsonb("request").$type<Record<string, any>>().default({}),
  outputGcsUris: jsonb("output_gcs_uris").$type<string[]>().default([]),
  outputMimeTypes: jsonb("output_mime_types").$type<string[]>().default([]),
  status: videoJobStatusEnum("status").default("queued").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const videoJobs = pgTable("video_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  videoVersionId: uuid("video_version_id")
    .notNull()
    .references(() => videoVersions.id, { onDelete: "cascade" }),
  provider: text("provider").default("vertex-veo").notNull(),
  operationName: text("operation_name").notNull(),
  status: videoJobStatusEnum("status").default("queued").notNull(),
  request: jsonb("request").$type<Record<string, any>>().default({}),
  response: jsonb("response").$type<Record<string, any>>().default({}),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sceneElements = pgTable("scene_elements", {
  id: uuid("id").defaultRandom().primaryKey(),
  sceneId: uuid("scene_id")
    .notNull()
    .references(() => scenes.id, { onDelete: "cascade" }),
  elementVersionId: uuid("element_version_id")
    .notNull()
    .references(() => elementVersions.id, { onDelete: "cascade" }),
  placement: jsonb("placement").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assetsRelations = relations(assets, ({ many }) => ({
  elementVersions: many(elementVersions),
}));

export const elementsRelations = relations(elements, ({ many, one }) => ({
  versions: many(elementVersions),
  jobs: many(elementJobs),
}));

export const elementVersionsRelations = relations(
  elementVersions,
  ({ one, many }) => ({
    element: one(elements, {
      fields: [elementVersions.elementId],
      references: [elements.id],
    }),
    asset: one(assets, {
      fields: [elementVersions.assetId],
      references: [assets.id],
    }),
    jobs: many(elementJobs),
  }),
);

export const elementJobsRelations = relations(elementJobs, ({ one }) => ({
  element: one(elements, {
    fields: [elementJobs.elementId],
    references: [elements.id],
  }),
  elementVersion: one(elementVersions, {
    fields: [elementJobs.elementVersionId],
    references: [elementVersions.id],
  }),
}));

export const scenesRelations = relations(scenes, ({ many }) => ({
  sceneElements: many(sceneElements),
}));

export const videosRelations = relations(videos, ({ many }) => ({
  versions: many(videoVersions),
}));

export const videoVersionsRelations = relations(videoVersions, ({ one, many }) => ({
  video: one(videos, {
    fields: [videoVersions.videoId],
    references: [videos.id],
  }),
  jobs: many(videoJobs),
}));

export const videoJobsRelations = relations(videoJobs, ({ one }) => ({
  videoVersion: one(videoVersions, {
    fields: [videoJobs.videoVersionId],
    references: [videoVersions.id],
  }),
}));

export const sceneElementsRelations = relations(
  sceneElements,
  ({ one }) => ({
    scene: one(scenes, {
      fields: [sceneElements.sceneId],
      references: [scenes.id],
    }),
    elementVersion: one(elementVersions, {
      fields: [sceneElements.elementVersionId],
      references: [elementVersions.id],
    }),
  }),
);

export type Asset = typeof assets.$inferSelect;
export type Element = typeof elements.$inferSelect;
export type ElementVersion = typeof elementVersions.$inferSelect;
export type ElementJob = typeof elementJobs.$inferSelect;
export type Scene = typeof scenes.$inferSelect;
export type SceneElement = typeof sceneElements.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type VideoVersion = typeof videoVersions.$inferSelect;
export type VideoJob = typeof videoJobs.$inferSelect;
