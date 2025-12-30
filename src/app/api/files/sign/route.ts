import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  storagePaths: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const prefix = `${user.id}/`;
  const unique = Array.from(new Set(parsed.data.storagePaths)).filter((p) => p.startsWith(prefix));

  const signedUrls: Record<string, string> = {};
  for (const storagePath of unique) {
    const { data, error } = await supabase.storage
      .from("user-uploads")
      .createSignedUrl(storagePath, 60 * 60);
    if (!error && data?.signedUrl) {
      signedUrls[storagePath] = data.signedUrl;
    }
  }

  return NextResponse.json({ signedUrls });
}

