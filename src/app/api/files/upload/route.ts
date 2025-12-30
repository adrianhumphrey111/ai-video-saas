import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { userUploads } from "@/server/db/schema";

const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 50 * 1024 * 1024, {
      message: "File size should be less than 50MB",
    })
    .refine((file) => ["image/jpeg", "image/png", "image/webp", "video/mp4"].includes(file.type), {
      message: "File type must be png/jpg/webp or mp4",
    }),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return NextResponse.json({ error: "Request body is empty" }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });
    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const filename = ((formData.get("file") as File | null)?.name || "upload").replace(
      /[^a-zA-Z0-9_.-]/g,
      "_",
    );

    const storagePath = `${user.id}/chat-attachments/${nanoid()}-${filename}`;
    const buffer = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("user-uploads")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data, error: signedError } = await supabase.storage
      .from("user-uploads")
      .createSignedUrl(storagePath, 60 * 60);

    if (signedError || !data?.signedUrl) {
      return NextResponse.json({ error: signedError?.message ?? "Failed to sign URL" }, { status: 500 });
    }

    const [uploadRow] = await db
      .insert(userUploads)
      .values({
        userId: user.id,
        storagePath,
        originalName: filename,
        mimeType: file.type,
        isAvatarReference: false,
      })
      .returning();

    return NextResponse.json({
      url: data.signedUrl,
      pathname: filename,
      contentType: file.type,
      storagePath,
      uploadId: uploadRow?.id ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
