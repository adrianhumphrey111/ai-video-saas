import { and, asc, eq, lte } from "drizzle-orm";

import { db } from "@/server/db";
import {
  ScheduledTweet,
  scheduledTweets,
  TwitterAccount,
  twitterAccounts,
} from "@/server/db/schema";
import { postTweet, refreshTwitterAccessToken } from "./client";
import { SchedulerError } from "./errors";

const DEFAULT_LIMIT = 20;
const EXPIRY_BUFFER_MS = 60 * 1000;

type ScheduleTweetInput = {
  userId: string;
  twitterAccountId: number;
  text: string;
  scheduledAt: Date;
  timeZone?: string;
};

export async function scheduleTweet(input: ScheduleTweetInput) {
  const trimmed = input.text.trim();
  if (!trimmed) {
    throw new SchedulerError("Tweet text cannot be empty.");
  }

  if (trimmed.length > 280) {
    throw new SchedulerError("Tweet text must be 280 characters or fewer.");
  }

  if (Number.isNaN(input.scheduledAt.getTime())) {
    throw new SchedulerError("scheduledAt must be a valid date.");
  }

  const now = Date.now();
  if (input.scheduledAt.getTime() < now - 60 * 1000) {
    throw new SchedulerError("scheduledAt must be in the future.");
  }

  const [result] = await db
    .insert(scheduledTweets)
    .values({
      userId: input.userId,
      twitterAccountId: input.twitterAccountId,
      text: trimmed,
      scheduledAt: input.scheduledAt,
      timeZone: input.timeZone ?? "America/Chicago",
      status: "pending",
    })
    .returning();

  return result;
}

export type SchedulerRunResult = {
  attempted: number;
  posted: number;
  failed: number;
  errors: Array<{ id: number; message: string }>;
};

export async function runTweetScheduler(limit = DEFAULT_LIMIT): Promise<SchedulerRunResult> {
  const now = new Date();
  const dueTweets = await db
    .select()
    .from(scheduledTweets)
    .where(
      and(
        eq(scheduledTweets.status, "pending"),
        lte(scheduledTweets.scheduledAt, now)
      )
    )
    .orderBy(asc(scheduledTweets.scheduledAt))
    .limit(limit);

  let posted = 0;
  let failed = 0;
  const errors: SchedulerRunResult["errors"] = [];

  for (const tweet of dueTweets) {
    const locked = await lockTweet(tweet.id);
    if (!locked) continue;

    try {
      await processTweet(locked);
      posted += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push({ id: tweet.id, message });
      await markTweetFailed(tweet.id, message);
    }
  }

  return {
    attempted: posted + failed,
    posted,
    failed,
    errors,
  };
}

async function processTweet(tweet: ScheduledTweet) {
  const account = await db.query.twitterAccounts.findFirst({
    where: eq(twitterAccounts.id, tweet.twitterAccountId),
  });

  if (!account) {
    throw new SchedulerError("Linked Twitter account not found.");
  }

  const accessToken = await ensureValidAccessToken(account);
  const { id } = await postTweet(accessToken, tweet.text);

  await db
    .update(scheduledTweets)
    .set({
      status: "posted",
      tweetId: id,
      updatedAt: new Date(),
    })
    .where(eq(scheduledTweets.id, tweet.id));
}

async function ensureValidAccessToken(account: TwitterAccount) {
  if (account.expiresAt && account.expiresAt.getTime() - EXPIRY_BUFFER_MS > Date.now()) {
    return account.accessToken;
  }

  const refreshed = await refreshTwitterAccessToken(account.refreshToken);
  await db
    .update(twitterAccounts)
    .set({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(twitterAccounts.id, account.id));

  return refreshed.accessToken;
}

async function lockTweet(id: number) {
  const [locked] = await db
    .update(scheduledTweets)
    .set({
      status: "processing",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(scheduledTweets.id, id),
        eq(scheduledTweets.status, "pending")
      )
    )
    .returning();

  return locked;
}

async function markTweetFailed(id: number, error: string) {
  await db
    .update(scheduledTweets)
    .set({
      status: "failed",
      errorMessage: error.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(scheduledTweets.id, id));
}
