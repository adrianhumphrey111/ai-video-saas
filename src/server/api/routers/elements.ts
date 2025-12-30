import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

import { router, publicProcedure } from "../trpc";
import {
  assets,
  elements,
  elementVersions,
} from "../../db/schema";
import { db } from "../../db";

const assetInput = z.object({
  storagePath: z.string(),
  publicUrl: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

const elementKinds = ["character", "object", "other"] as const;
const uploadBucket = process.env.NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET ?? "user-uploads";

function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

export const elementsRouter = router({
  createElement: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        kind: z.enum(elementKinds),
        name: z.string().min(1).default("Untitled element"),
        summary: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const elementId = randomUUID();

      const [element] = await db
        .insert(elements)
        .values({
          id: elementId,
          userId: input.userId,
          kind: input.kind,
          name: input.name || "Untitled element",
          summary: input.summary,
          tags: input.tags,
          status: "draft",
        })
        .returning();

      return element;
    }),

  createVersionFromUpload: publicProcedure
    .input(
      z.object({
        elementId: z.string().uuid().optional(),
        userId: z.string(),
        kind: z.enum(elementKinds).default("character"),
        name: z.string().optional(),
        summary: z.string().optional(),
        tags: z.array(z.string()).optional(),
        prompt: z.string().optional(),
        diffInstruction: z.string().optional(),
        attributes: z.record(z.any()).optional(),
        source: z.string().optional(), // upload|generate|edit|import
        asset: assetInput,
      }),
    )
    .mutation(async ({ input }) => {
      const elementId = input.elementId ?? randomUUID();

      // Ensure element exists
      await db
        .insert(elements)
        .values({
          id: elementId,
          userId: input.userId,
          kind: input.kind,
          name: input.name || "Untitled element",
          summary: input.summary,
          tags: input.tags,
          status: "draft",
        })
        .onConflictDoNothing();

      // Insert asset
      const [asset] = await db
        .insert(assets)
        .values({
          userId: input.userId,
          storagePath: input.asset.storagePath,
          publicUrl: input.asset.publicUrl,
          mimeType: input.asset.mimeType,
          sizeBytes: input.asset.sizeBytes,
          width: input.asset.width,
          height: input.asset.height,
          kind: "image",
        })
        .returning();

      // Determine next version number
      const [latest] = await db
        .select({
          id: elementVersions.id,
          versionNumber: elementVersions.versionNumber,
        })
        .from(elementVersions)
        .where(eq(elementVersions.elementId, elementId))
        .orderBy(desc(elementVersions.versionNumber))
        .limit(1);

      const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;
      const parentVersionId = latest?.id ?? null;

      const [version] = await db
        .insert(elementVersions)
        .values({
          elementId,
          versionNumber: nextVersionNumber,
          parentVersionId,
          status: "ready",
          source: input.source ?? "upload",
          prompt: input.prompt,
          diffInstruction: input.diffInstruction,
          attributes: input.attributes ?? {},
          assetId: asset.id,
          createdBy: input.userId,
        })
        .returning();

      await db
        .update(elements)
        .set({
          latestVersionId: version.id,
          thumbnailUrl: asset.publicUrl,
          status: "ready",
          name: input.name || "Untitled element",
          summary: input.summary,
          tags: input.tags,
          updatedAt: new Date(),
        })
        .where(eq(elements.id, elementId));

      return { elementId, versionId: version.id, imageUrl: asset.publicUrl };
    }),

  updateName: publicProcedure
    .input(z.object({ id: z.string().uuid(), userId: z.string(), name: z.string().trim().min(1).max(60) }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .select({ id: elements.id, userId: elements.userId })
        .from(elements)
        .where(eq(elements.id, input.id))
        .limit(1);
      if (!row || row.userId !== input.userId) {
        throw new Error("Forbidden");
      }

      const [updated] = await db
        .update(elements)
        .set({ name: input.name, updatedAt: new Date() })
        .where(eq(elements.id, input.id))
        .returning();

      return updated;
    }),

  list: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        kind: z.enum(elementKinds).optional(),
      }),
    )
    .query(async ({ input }) => {
      const elementRows = await db
        .select({ element: elements })
        .from(elements)
        .where(
          input.kind
            ? and(eq(elements.userId, input.userId), eq(elements.kind, input.kind))
            : eq(elements.userId, input.userId),
        )
        .orderBy(desc(elements.updatedAt));

      const ids = elementRows.map((r) => r.element.id);
      if (!ids.length) return [];

      const versionRows = await db
        .select({ version: elementVersions, asset: assets })
        .from(elementVersions)
        .leftJoin(assets, eq(assets.id, elementVersions.assetId))
        .where(inArray(elementVersions.elementId, ids))
        .orderBy(desc(elementVersions.versionNumber));

      const latestMap: Record<
        string,
        { version: typeof elementVersions.$inferSelect; asset: typeof assets.$inferSelect | null }
      > = {};

      for (const row of versionRows) {
        const elId = row.version.elementId;
        if (!latestMap[elId]) {
          latestMap[elId] = { version: row.version, asset: row.asset ?? null };
        }
      }

      const supabase = getSupabaseServiceClient();

      const results = await Promise.all(
        elementRows.map(async (row) => {
          const latest = latestMap[row.element.id];
          let asset = latest?.asset ?? null;
          let imageUrl = '';
          let signedUrl: string | null = null;

          if (supabase && asset?.storagePath) {
            const { data, error } = await supabase.storage
              .from(uploadBucket)
              .createSignedUrl(asset.storagePath, 60 * 60);
            if (!error && data?.signedUrl) {
              signedUrl = data.signedUrl;
              imageUrl = data.signedUrl; // prefer signed URL for private bucket
            }
          }

          return {
            ...row.element,
            latestVersion: latest?.version ?? null,
            asset,
            imageUrl,
            signedUrl,
          };
        }),
      );

      return results;
    }),

  listVersions: publicProcedure
    .input(z.object({ elementId: z.string().uuid(), userId: z.string() }))
    .query(async ({ input }) => {
      const [owner] = await db
        .select({ userId: elements.userId })
        .from(elements)
        .where(eq(elements.id, input.elementId))
        .limit(1);
      if (!owner || owner.userId !== input.userId) return [];

      const rows = await db
        .select({ version: elementVersions, asset: assets })
        .from(elementVersions)
        .leftJoin(assets, eq(assets.id, elementVersions.assetId))
        .where(eq(elementVersions.elementId, input.elementId))
        .orderBy(desc(elementVersions.versionNumber))
        .limit(50);

      const supabase = getSupabaseServiceClient();

      return Promise.all(
        rows.map(async (r) => {
          const storagePath = r.asset?.storagePath ?? null;
          let signedUrl: string | null = null;
          if (supabase && storagePath) {
            const { data, error } = await supabase.storage
              .from(uploadBucket)
              .createSignedUrl(storagePath, 60 * 60);
            if (!error && data?.signedUrl) signedUrl = data.signedUrl;
          }

          return {
            id: r.version.id,
            versionNumber: r.version.versionNumber,
            status: r.version.status,
            source: r.version.source,
            createdAt: r.version.createdAt,
            prompt: r.version.prompt,
            diffInstruction: r.version.diffInstruction,
            asset: r.asset,
            signedUrl,
            imageUrl: signedUrl || r.asset?.publicUrl || "",
            storagePath,
          };
        }),
      );
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select({
          element: elements,
          version: elementVersions,
          asset: assets,
        })
        .from(elements)
        .leftJoin(
          elementVersions,
          eq(elementVersions.id, elements.latestVersionId),
        )
        .leftJoin(assets, eq(assets.id, elementVersions.assetId))
        .where(and(eq(elements.id, input.id), eq(elements.userId, input.userId)))
        .limit(1);

      return row
        ? {
            ...row.element,
            latestVersion: row.version,
            asset: row.asset,
          }
        : null;
    }),

  deleteElement: publicProcedure
    .input(z.object({ id: z.string().uuid(), userId: z.string() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(elements)
        .where(and(eq(elements.id, input.id), eq(elements.userId, input.userId)))
        .returning({ id: elements.id });

      return { success: Boolean(deleted), id: deleted?.id ?? null };
    }),
});
