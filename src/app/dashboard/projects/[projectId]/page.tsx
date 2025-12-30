import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";

import { VideoAgentClient } from "./video-agent-client";

type PageProps = {
  params: { projectId: string } | Promise<{ projectId: string }>;
};

export default async function ProjectVideoAgentPage({ params }: PageProps) {
  const { projectId } = await Promise.resolve(params);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.userId !== user.id) {
    redirect("/dashboard");
  }

  return <VideoAgentClient project={project} />;
}
