import { relations } from "drizzle-orm/relations";
import { twitterAccounts, scheduledTweets, elementVersions, sceneElements, scenes, elements, elementJobs, assets, avatars, avatarGenerations } from "./schema";

export const scheduledTweetsRelations = relations(scheduledTweets, ({one}) => ({
	twitterAccount: one(twitterAccounts, {
		fields: [scheduledTweets.twitterAccountId],
		references: [twitterAccounts.id]
	}),
}));

export const twitterAccountsRelations = relations(twitterAccounts, ({many}) => ({
	scheduledTweets: many(scheduledTweets),
}));

export const sceneElementsRelations = relations(sceneElements, ({one}) => ({
	elementVersion: one(elementVersions, {
		fields: [sceneElements.elementVersionId],
		references: [elementVersions.id]
	}),
	scene: one(scenes, {
		fields: [sceneElements.sceneId],
		references: [scenes.id]
	}),
}));

export const elementVersionsRelations = relations(elementVersions, ({one, many}) => ({
	sceneElements: many(sceneElements),
	elementJobs: many(elementJobs),
	asset: one(assets, {
		fields: [elementVersions.assetId],
		references: [assets.id]
	}),
	element: one(elements, {
		fields: [elementVersions.elementId],
		references: [elements.id]
	}),
}));

export const scenesRelations = relations(scenes, ({many}) => ({
	sceneElements: many(sceneElements),
}));

export const elementJobsRelations = relations(elementJobs, ({one}) => ({
	element: one(elements, {
		fields: [elementJobs.elementId],
		references: [elements.id]
	}),
	elementVersion: one(elementVersions, {
		fields: [elementJobs.elementVersionId],
		references: [elementVersions.id]
	}),
}));

export const elementsRelations = relations(elements, ({many}) => ({
	elementJobs: many(elementJobs),
	elementVersions: many(elementVersions),
}));

export const assetsRelations = relations(assets, ({many}) => ({
	elementVersions: many(elementVersions),
}));

export const avatarGenerationsRelations = relations(avatarGenerations, ({one}) => ({
	avatar: one(avatars, {
		fields: [avatarGenerations.avatarId],
		references: [avatars.id]
	}),
}));

export const avatarsRelations = relations(avatars, ({many}) => ({
	avatarGenerations: many(avatarGenerations),
}));