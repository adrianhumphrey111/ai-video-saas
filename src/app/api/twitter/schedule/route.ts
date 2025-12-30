import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { scheduleTweet } from "@/server/twitter/scheduler";

const requestSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  twitterAccountId: z.number().int().positive(),
  text: z.string().min(1).max(280),
  scheduledAt: z.string().datetime({ offset: true }),
  timeZone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const payload = requestSchema.parse(body);

  const scheduled = await scheduleTweet({
    userId: payload.userId,
    twitterAccountId: payload.twitterAccountId,
    text: payload.text,
    scheduledAt: new Date(payload.scheduledAt),
    timeZone: payload.timeZone ?? "America/Chicago",
  });

  return NextResponse.json({ scheduled });
}
