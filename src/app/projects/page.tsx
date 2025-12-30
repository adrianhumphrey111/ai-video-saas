import Link from "next/link";
import { ArrowRight, Clock3, FolderKanban, Plus, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { mockProjects } from "@/lib/mock-projects";

const statusStyles: Record<
  string,
  { text: string; classes: string }
> = {
  "In progress": { text: "In progress", classes: "bg-amber-500/15 text-amber-200 ring-amber-500/30" },
  Review: { text: "In review", classes: "bg-sky-500/15 text-sky-200 ring-sky-500/30" },
  Draft: { text: "Draft", classes: "bg-slate-500/20 text-slate-200 ring-slate-500/40" },
};

export default function ProjectsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#05060a] via-[#0b0c11] to-black text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(99,102,241,0.12),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.12),transparent_35%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_80%,rgba(16,185,129,0.1),transparent_35%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-10">
        <header className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Workspace</p>
            <h1 className="text-3xl font-semibold text-white">Projects</h1>
            <p className="mt-1 text-sm text-slate-400">
              Start from the dashboard and jump into any project. Real data wiring will come next.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
              asChild
            >
              <Link href="/dashboard">
                <FolderKanban className="mr-2 h-4 w-4" />
                Back to dashboard
              </Link>
            </Button>
            <Button
              variant="secondary"
              className="rounded-full border border-white/10 bg-white/20 text-white hover:bg-white/30"
              disabled
            >
              <Plus className="mr-2 h-4 w-4" />
              New project
            </Button>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockProjects.map((project) => {
            const status = statusStyles[project.status];
            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="group">
                <Card className="h-full overflow-hidden border-white/10 bg-white/5 text-white transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                  <CardHeader className="pb-3">
                    <div
                      className={cn(
                        "relative mb-4 h-32 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br",
                        project.accent,
                      )}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.2),transparent_35%)]" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_60%,rgba(255,255,255,0.14),transparent_40%)]" />
                      <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold">
                        {project.tags[0]}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FolderKanban className="mt-1 h-4 w-4 text-slate-400" />
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <CardDescription className="text-sm text-slate-300">
                          {project.summary}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                          status?.classes,
                        )}
                      >
                        {status?.text ?? project.status}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                        <User className="h-3.5 w-3.5" />
                        {project.owner}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                        <Clock3 className="h-3.5 w-3.5" />
                        {project.updated}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-white to-slate-200"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>{project.progress}% complete</span>
                      <span className="inline-flex items-center gap-1 text-slate-200 group-hover:text-white">
                        View project
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
