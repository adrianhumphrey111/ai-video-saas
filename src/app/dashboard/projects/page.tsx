import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { ProjectsClient } from "@/app/dashboard/projects/projects-client";
import { NewProjectButton } from "@/app/dashboard/projects/new-project-button";

export default async function DashboardProjectsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.updatedAt));

  async function createProject(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const nameRaw = formData.get("name");
    const name =
      typeof nameRaw === "string" && nameRaw.trim().length > 0
        ? nameRaw.trim().slice(0, 60)
        : "New Project";

    const id = crypto.randomUUID();
    await db.insert(projects).values({
      id,
      userId: user.id,
      name,
      summary: "A new project for video generation.",
      status: "In progress",
      updated: "Just now",
      owner: user.email ?? "You",
      progress: 0,
      tags: ["Video Agent"],
      accent: "from-indigo-500/30 to-violet-500/30",
      script: "",
      shots: [],
    });
    redirect(`/dashboard/projects/${id}`);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#05060a] via-[#0b0c11] to-black text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(99,102,241,0.12),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.12),transparent_35%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-10">
        <header className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Workspace</p>
            <h1 className="text-3xl font-semibold text-white">Projects</h1>
            <p className="mt-1 text-sm text-slate-400">
              Pick a project to open the Video Agent.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NewProjectButton action={createProject} />
          </div>
        </header>

        {rows.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
            No projects yet.
          </div>
        ) : (
          <ProjectsClient projects={rows} />
        )}
      </div>
    </div>
  );
}
