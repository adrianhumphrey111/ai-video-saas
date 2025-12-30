import { db } from "@/server/db";
import { assets, userUploads } from "@/server/db/schema";
import { eq } from "drizzle-orm";

import { downloadSupabaseObject } from "./supabase-download";
import { buildGcsInputPath, uploadToGcs } from "./storage";

function guessExtFromMime(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "video/mp4") return "mp4";
  return "bin";
}

export async function ensureUploadMirroredToGcs(args: {
  uploadId: string;
  userId: string;
  projectId: string;
}) {
  const [row] = await db
    .select()
    .from(userUploads)
    .where(eq(userUploads.id, args.uploadId))
    .limit(1);

  if (!row) throw new Error("Upload not found");
  if (row.userId !== args.userId) throw new Error("Forbidden");
  if (row.gcsUri) return { gcsUri: row.gcsUri, mimeType: row.mimeType };

  const data = await downloadSupabaseObject(row.storagePath);
  const destinationPath = buildGcsInputPath({
    userId: args.userId,
    projectId: args.projectId,
    sourceId: `upload-${row.id}`,
    ext: guessExtFromMime(row.mimeType),
  });
  const gcsUri = await uploadToGcs({
    destinationPath,
    contentType: row.mimeType,
    data,
  });

  await db
    .update(userUploads)
    .set({ gcsUri })
    .where(eq(userUploads.id, row.id));

  return { gcsUri, mimeType: row.mimeType };
}

export async function ensureAssetMirroredToGcs(args: {
  assetId: string;
  userId: string;
  projectId: string;
}) {
  const [row] = await db.select().from(assets).where(eq(assets.id, args.assetId)).limit(1);
  if (!row) throw new Error("Asset not found");
  if (row.userId !== args.userId) throw new Error("Forbidden");
  if (row.gcsUri) return { gcsUri: row.gcsUri, mimeType: row.mimeType };

  const data = await downloadSupabaseObject(row.storagePath);
  const destinationPath = buildGcsInputPath({
    userId: args.userId,
    projectId: args.projectId,
    sourceId: `asset-${row.id}`,
    ext: guessExtFromMime(row.mimeType),
  });
  const gcsUri = await uploadToGcs({
    destinationPath,
    contentType: row.mimeType,
    data,
  });

  await db.update(assets).set({ gcsUri }).where(eq(assets.id, row.id));
  return { gcsUri, mimeType: row.mimeType };
}

