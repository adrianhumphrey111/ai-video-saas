import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";

export const runtime = "nodejs";

const bodySchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1).max(60),
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

  const [project] = await db
    .select({ id: projects.id, userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, parsed.data.projectId))
    .limit(1);

  if (!project || project.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .update(projects)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(eq(projects.id, parsed.data.projectId));

  return NextResponse.json({ ok: true, name: parsed.data.name });
}

