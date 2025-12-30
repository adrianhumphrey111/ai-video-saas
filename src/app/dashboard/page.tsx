import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { randomUUID } from "crypto";
import { projects as projectsTable } from "@/server/db/schema";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Join with Drizzle query
  // Since we don't have the table pushed yet, this might error in runtime if user tries it before migration.
  // But strictly speaking for code correctness:

  const projects = await db.query.projects.findMany({
    where: (projects, { eq }) => eq(projects.userId, user.id),
  });

  if (projects.length === 0) {
    const id = randomUUID();
    await db.insert(projectsTable).values({
      id,
      userId: user.id,
      name: "My First Project",
      summary: "Your workspace for generating videos with the Video Agent.",
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

  redirect(`/dashboard/projects/${projects[0]!.id}`);
}
