import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { videoJobs, videoVersions } from "@/server/db/schema";
import { fetchVeoOperation } from "@/lib/gcp/veo";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const vertexProjectId = process.env.GOOGLE_VERTEX_PROJECT ?? "";
  const location = process.env.GOOGLE_VERTEX_LOCATION ?? "us-central1";
  if (!vertexProjectId) {
    return NextResponse.json({ error: "Missing GOOGLE_VERTEX_PROJECT" }, { status: 500 });
  }

  const jobs = await db
    .select()
    .from(videoJobs)
    .where(eq(videoJobs.status, "running"))
    .limit(10);

  const updated: Array<{ jobId: string; status: string }> = [];

  for (const job of jobs) {
    try {
      const op = await fetchVeoOperation({
        projectId: vertexProjectId,
        location,
        operationName: job.operationName,
      });

      if (!op?.done) {
        updated.push({ jobId: job.id, status: "running" });
        continue;
      }

      const videosArr = (op?.response?.videos ?? []) as Array<{ gcsUri: string; mimeType: string }>;
      const gcsUris = videosArr.map((v) => v.gcsUri).filter(Boolean);
      const mimeTypes = videosArr.map((v) => v.mimeType).filter(Boolean);

      await db
        .update(videoJobs)
        .set({
          status: "succeeded",
          response: op as any,
          updatedAt: new Date(),
        })
        .where(eq(videoJobs.id, job.id));

      await db
        .update(videoVersions)
        .set({
          status: "succeeded",
          outputGcsUris: gcsUris as any,
          outputMimeTypes: mimeTypes as any,
          updatedAt: new Date(),
        })
        .where(eq(videoVersions.id, job.videoVersionId));

      updated.push({ jobId: job.id, status: "succeeded" });
    } catch (err: any) {
      await db
        .update(videoJobs)
        .set({
          status: "failed",
          error: err?.message ?? "Unknown error",
          updatedAt: new Date(),
        })
        .where(eq(videoJobs.id, job.id));

      await db
        .update(videoVersions)
        .set({
          status: "failed",
          error: err?.message ?? "Unknown error",
          updatedAt: new Date(),
        })
        .where(eq(videoVersions.id, job.videoVersionId));

      updated.push({ jobId: job.id, status: "failed" });
    }
  }

  return NextResponse.json({ checked: jobs.length, updated });
}
