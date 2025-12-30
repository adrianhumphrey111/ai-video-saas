import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, FolderKanban, Play, Sparkles, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getProjectById } from "@/lib/mock-projects";

const statusStyles: Record<
  string,
  { text: string; classes: string }
> = {
  "In progress": { text: "In progress", classes: "bg-amber-500/15 text-amber-200 ring-amber-500/30" },
  Review: { text: "In review", classes: "bg-sky-500/15 text-sky-200 ring-sky-500/30" },
  Draft: { text: "Draft", classes: "bg-slate-500/20 text-slate-200 ring-slate-500/40" },
};

type ProjectPageProps = {
  params: { projectId: string };
};

export default function ProjectDetailPage({ params }: ProjectPageProps) {
  const project = getProjectById(params.projectId);

  if (!project) {
    notFound();
  }

  const status = statusStyles[project.status];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#05060a] via-[#0b0c11] to-black text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(99,102,241,0.12),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.12),transparent_35%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_80%,rgba(16,185,129,0.1),transparent_35%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-start gap-3">
          <Button
            variant="ghost"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
            asChild
          >
            <Link href="/projects">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Projects
            </Link>
          </Button>
          <div className="flex-1 space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Project</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-white">{project.name}</h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                  status?.classes,
                )}
              >
                {status?.text ?? project.status}
              </span>
            </div>
            <p className="text-sm text-slate-300">{project.summary}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-slate-200">
                <User className="h-3.5 w-3.5" />
                {project.owner}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-slate-200">
                <Clock3 className="h-3.5 w-3.5" />
                Updated {project.updated}
              </span>
              {project.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-slate-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <Button className="rounded-full bg-white text-black hover:bg-white/90" disabled>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate draft
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Play className="h-4 w-4 text-slate-300" />
                Canvas preview
              </CardTitle>
              <CardDescription className="text-slate-300">
                Placeholder preview surface for the project. Wire real media once storage/schema is ready.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "relative h-72 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br",
                  project.accent,
                )}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.2),transparent_35%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_60%,rgba(255,255,255,0.14),transparent_40%)]" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur">
                  <div>
                    <p className="text-sm text-slate-200">Script marker</p>
                    <p className="text-xs text-slate-400">Preview area</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Ready to wire
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Meta</CardTitle>
              <CardDescription className="text-slate-300">Quick facts to sync later.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                <span className="text-slate-300">Owner</span>
                <span className="text-white">{project.owner}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                <span className="text-slate-300">Status</span>
                <span className="text-white">{status?.text ?? project.status}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                <span className="text-slate-300">Progress</span>
                <span className="text-white">{project.progress}%</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tags</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Script</CardTitle>
              <CardDescription className="text-slate-300">
                Static placeholder script; replace with editor later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm leading-relaxed text-slate-100">
                {project.script}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Shots</CardTitle>
              <CardDescription className="text-slate-300">Lightweight checklist for now.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {project.shots.map((shot) => (
                <div
                  key={shot.title}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{shot.title}</p>
                      <p className="text-xs text-slate-400">{shot.type}</p>
                    </div>
                    <span className="text-xs text-slate-300">{shot.duration}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
