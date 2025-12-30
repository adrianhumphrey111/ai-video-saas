import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, Film, Layers } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { projects, videoVersions, videos } from "@/server/db/schema";
import { signGcsUrl } from "@/lib/gcp/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PageProps = {
  params:
    | { projectId: string; videoId: string }
    | Promise<{ projectId: string; videoId: string }>;
  searchParams?: { version?: string } | Promise<{ version?: string }>;
};

const statusStyles: Record<string, string> = {
  queued: "bg-slate-500/20 text-slate-200 ring-slate-500/40",
  running: "bg-indigo-500/15 text-indigo-200 ring-indigo-500/30",
  succeeded: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  failed: "bg-rose-500/15 text-rose-200 ring-rose-500/30",
};

export default async function VideoDetailPage({ params, searchParams }: PageProps) {
  const { projectId, videoId } = await Promise.resolve(params);
  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : undefined;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.userId !== user.id) redirect("/dashboard");

  const [video] = await db
    .select()
    .from(videos)
    .where(and(eq(videos.id, videoId as any), eq(videos.projectId, project.id)))
    .limit(1);
  if (!video) redirect(`/dashboard/projects/${project.id}/videos`);

  const versions = await db
    .select()
    .from(videoVersions)
    .where(eq(videoVersions.videoId, video.id))
    .orderBy(desc(videoVersions.createdAt));

  const selectedVersion =
    (resolvedSearchParams?.version
      ? versions.find((v) => v.id === resolvedSearchParams.version)
      : null) ?? versions[0];

  const gcsUris = (selectedVersion?.outputGcsUris ?? []) as any as string[];
  const previewUrls =
    selectedVersion?.status === "succeeded"
      ? await Promise.all(gcsUris.map((u) => signGcsUrl(u)))
      : [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#05060a] via-[#0b0c11] to-black text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(99,102,241,0.12),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.12),transparent_35%)]" />
      </div>

      <div className="relative mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Video</p>
            <h1 className="mt-1 text-2xl font-semibold text-white flex items-center gap-2">
              <Film className="h-5 w-5 text-indigo-300" />
              {video.title || "Untitled video"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">{project.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
              asChild
            >
              <Link href={`/dashboard/projects/${project.id}/videos`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to videos
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-white/10 bg-white/5 text-white overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedVersion ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                        statusStyles[selectedVersion.status] ?? statusStyles.queued,
                      )}
                    >
                      {selectedVersion.status}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                      {selectedVersion.durationSeconds}s
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                      {selectedVersion.resolution}
                    </span>
                  </div>

                  {selectedVersion.status === "succeeded" && previewUrls[0] ? (
                    <video
                      key={previewUrls[0]}
                      controls
                      preload="metadata"
                      className="w-full rounded-2xl border border-white/10 bg-black/40"
                      src={previewUrls[0]}
                    />
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-slate-300">
                      {selectedVersion.status === "running"
                        ? "Generating… refresh in a bit."
                        : selectedVersion.status === "failed"
                          ? selectedVersion.error || "Generation failed."
                          : "Not ready yet."}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-slate-300">No versions yet.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-300" />
                Versions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {versions.length === 0 ? (
                <div className="text-sm text-slate-300">No versions.</div>
              ) : (
                versions.map((v) => (
                  <Link
                    key={v.id}
                    href={`/dashboard/projects/${project.id}/videos/${video.id}?version=${v.id}`}
                    className={cn(
                      "block rounded-xl border border-white/10 bg-black/20 p-3 text-sm transition hover:bg-white/5",
                      v.id === selectedVersion?.id ? "ring-1 ring-indigo-500/40" : "",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">v{versions.findIndex((x) => x.id === v.id) + 1}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                          statusStyles[v.status] ?? statusStyles.queued,
                        )}
                      >
                        {v.status}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-400 line-clamp-3">
                      {v.prompt}
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
