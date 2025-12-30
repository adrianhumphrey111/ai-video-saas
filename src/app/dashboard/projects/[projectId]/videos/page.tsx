import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Film, ArrowLeft, PlayCircle } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { projects, videoVersions, videos } from "@/server/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageProps = {
  params: { projectId: string } | Promise<{ projectId: string }>;
};

const statusStyles: Record<string, string> = {
  queued: "bg-slate-500/20 text-slate-200 ring-slate-500/40",
  running: "bg-indigo-500/15 text-indigo-200 ring-indigo-500/30",
  succeeded: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  failed: "bg-rose-500/15 text-rose-200 ring-rose-500/30",
};

export default async function ProjectVideosPage({ params }: PageProps) {
  const { projectId } = await Promise.resolve(params);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.userId !== user.id) redirect("/dashboard");

  const videoRows = await db
    .select()
    .from(videos)
    .where(and(eq(videos.projectId, project.id), eq(videos.userId, user.id)))
    .orderBy(desc(videos.updatedAt))
    .limit(50);

  const ids = videoRows.map((v) => v.id);
  const latestByVideoId: Record<string, any> = {};

  if (ids.length > 0) {
    const versionRows = await db
      .select()
      .from(videoVersions)
      .where(inArray(videoVersions.videoId, ids))
      .orderBy(desc(videoVersions.createdAt));

    for (const ver of versionRows) {
      if (!latestByVideoId[ver.videoId]) latestByVideoId[ver.videoId] = ver;
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#05060a] via-[#0b0c11] to-black text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(99,102,241,0.12),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.12),transparent_35%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Project</p>
            <h1 className="mt-1 text-2xl font-semibold text-white flex items-center gap-2">
              <Film className="h-5 w-5 text-indigo-300" />
              Videos
            </h1>
            <p className="mt-1 text-sm text-slate-400">{project.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
              asChild
            >
              <Link href={`/dashboard/projects/${project.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to agent
              </Link>
            </Button>
          </div>
        </div>

        {videoRows.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
            No videos yet. Go back to the agent and generate your first one.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videoRows.map((v) => {
              const latest = latestByVideoId[v.id];
              const status = latest?.status ?? "queued";
              return (
                <Link
                  key={v.id}
                  href={`/dashboard/projects/${project.id}/videos/${v.id}`}
                  className="group"
                >
                  <Card className="h-full overflow-hidden border-white/10 bg-white/5 text-white transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <PlayCircle className="h-5 w-5 text-slate-300" />
                        {v.title || "Untitled video"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                            statusStyles[status] ?? statusStyles.queued,
                          )}
                        >
                          {status}
                        </span>
                        {latest?.durationSeconds && (
                          <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                            {latest.durationSeconds}s
                          </span>
                        )}
                        {latest?.resolution && (
                          <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                            {latest.resolution}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-300 line-clamp-3">
                        {latest?.prompt ?? "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Versions:{" "}
                        {latestByVideoId[v.id] ? 1 : 0}+
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
