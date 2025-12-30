import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { videoVersions } from "@/server/db/schema";
import { signGcsUrl } from "@/lib/gcp/storage";

export const runtime = "nodejs";

const bodySchema = z.object({
  versionId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [row] = await db
    .select()
    .from(videoVersions)
    .where(eq(videoVersions.id, parsed.data.versionId))
    .limit(1);

  if (!row || row.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const gcsUris = (row.outputGcsUris ?? []) as any as string[];
  const previewUrls =
    row.status === "succeeded" && gcsUris.length > 0
      ? await Promise.all(gcsUris.map((u) => signGcsUrl(u)))
      : [];

  return NextResponse.json({
    ok: true,
    versionId: row.id,
    videoId: row.videoId,
    projectId: row.projectId,
    status: row.status,
    prompt: row.prompt,
    resolution: row.resolution,
    durationSeconds: row.durationSeconds,
    aspectRatio: row.aspectRatio,
    outputGcsUris: gcsUris,
    previewUrls,
  });
}

