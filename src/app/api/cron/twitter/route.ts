import { NextRequest, NextResponse } from "next/server";

import { runTweetScheduler } from "@/server/twitter/scheduler";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runTweetScheduler();
  return NextResponse.json(result);
}
