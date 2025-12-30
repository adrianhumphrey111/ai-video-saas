import { NextRequest } from "next/server";
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

import { vertex } from "@/lib/vertex";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { assets, elementVersions, elements, projects, videoJobs, videoVersions, videos } from "@/server/db/schema";
import { ensureAssetMirroredToGcs, ensureUploadMirroredToGcs } from "@/lib/gcp/mirror";
import { fetchVeoOperation, startVeoOperation } from "@/lib/gcp/veo";
import { signGcsUrl } from "@/lib/gcp/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

const veoModeEnum = z.enum([
  "auto",
  "text_to_video",
  "image_to_video",
  "references_to_video",
  "frame_interpolation",
  "video_extension",
  "inpaint",
]);

function extractMentions(text: string) {
  const matches = text.match(/@([a-zA-Z0-9-]+)/g) ?? [];
  const labels = matches.map((m) => m.slice(1));
  return Array.from(new Set(labels));
}

function extractMentionsInOrder(text: string) {
  const matches = text.match(/@([a-zA-Z0-9-]+)/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const label = m.slice(1);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

function getTextFromUiMessage(message: any) {
  if (typeof message?.content === "string") return message.content;
  if (Array.isArray(message?.parts)) {
    return message.parts
      .filter((p: any) => p?.type === "text" && typeof p.text === "string")
      .map((p: any) => p.text)
      .join("");
  }
  return "";
}

type FileRef = {
  label: string;
  uploadId?: string;
  storagePath?: string;
  mimeType?: string;
};

function buildFileRegistry(uiMessages: any[]) {
  const registry: Record<string, FileRef> = {};
  for (const m of uiMessages) {
    const parts = Array.isArray(m?.parts) ? m.parts : [];
    let lastLabel: string | null = null;
    for (const part of parts) {
      if (part?.type === "text" && typeof part.text === "string") {
        const t = part.text.trim();
        if (/^@image-\d+$/.test(t)) lastLabel = t.slice(1);
      } else if (part?.type === "file") {
        const label = (typeof part.imageId === "string" && part.imageId) || lastLabel;
        if (label) {
          registry[label] = {
            label,
            uploadId: typeof part.uploadId === "string" ? part.uploadId : undefined,
            storagePath: typeof part.storagePath === "string" ? part.storagePath : undefined,
            mimeType: typeof part.mediaType === "string" ? part.mediaType : undefined,
          };
        }
        lastLabel = null;
      }
    }
  }
  return registry;
}

type AssetRef = {
  label: string;
  elementId: string;
  elementKind?: string;
};

function buildAssetRegistry(uiMessages: any[]) {
  const registry: Record<string, AssetRef> = {};
  for (const m of uiMessages) {
    const parts = Array.isArray(m?.parts) ? m.parts : [];
    let lastLabel: string | null = null;
    for (const part of parts) {
      if (part?.type === "text" && typeof part.text === "string") {
        const t = part.text.trim();
        if (/^@[a-zA-Z0-9-]+$/.test(t)) lastLabel = t.slice(1);
      } else if (part?.type === "asset") {
        const label = (typeof part.label === "string" && part.label) || lastLabel;
        const elementId = typeof part.elementId === "string" ? part.elementId : null;
        if (label && elementId) {
          registry[label] = {
            label,
            elementId,
            elementKind: typeof part.elementKind === "string" ? part.elementKind : undefined,
          };
        }
        lastLabel = null;
      }
    }
  }
  return registry;
}

async function requireProjectOwnership(args: { projectId: string; userId: string }) {
  const [proj] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, args.projectId), eq(projects.userId, args.userId)))
    .limit(1);
  if (!proj) throw new Error("Project not found");
  return proj;
}

async function resolveElementLatestAsset(args: { elementId: string; userId: string }) {
  const [row] = await db
    .select({
      assetId: elementVersions.assetId,
      gcsUri: assets.gcsUri,
      mimeType: assets.mimeType,
    })
    .from(elements)
    .leftJoin(elementVersions, eq(elementVersions.id, elements.latestVersionId))
    .leftJoin(assets, eq(assets.id, elementVersions.assetId))
    .where(and(eq(elements.id, args.elementId as any), eq(elements.userId, args.userId)))
    .limit(1);

  if (!row?.assetId) return null;
  return {
    assetId: row.assetId,
    gcsUri: row.gcsUri ?? null,
    mimeType: row.mimeType ?? null,
  };
}

async function pollVeoUntilDone(args: {
  projectId: string;
  location: string;
  operationName: string;
  timeoutMs: number;
  intervalMs: number;
}) {
  const start = Date.now();
  while (Date.now() - start < args.timeoutMs) {
    const op = await fetchVeoOperation({
      projectId: args.projectId,
      location: args.location,
      operationName: args.operationName,
    });
    if (op?.done) return op;
    await new Promise((r) => setTimeout(r, args.intervalMs));
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const uiMessages = body?.messages ?? [];
  const projectId = body?.projectId as string | undefined;
  const referenceSet = (body?.referenceSet ?? null) as
    | { locked?: string[]; unlocked?: string[]; strategy?: string }
    | null;
  const editContext = (body?.editContext ?? null) as
    | { mode?: "generate" | "inpaint"; maskUploadId?: string }
    | null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
  }

  if (!projectId) {
    return new Response(JSON.stringify({ error: "Missing projectId" }), { status: 400 });
  }

  await requireProjectOwnership({ projectId, userId: user.id });

  const fileRegistry = buildFileRegistry(uiMessages);
  const assetRegistry = buildAssetRegistry(uiMessages);

  const result = streamText({
    model: vertex("gemini-3-pro-preview"),
    messages: await convertToModelMessages(uiMessages),
    stopWhen: stepCountIs(10),
    system: `You are VidNova's Video Agent.
You help users generate short videos with Veo 3.1.

Users can attach images/videos and reference them in text as @image-1, @image-2, etc.
Users can also tag assets like @stacy (avatars/objects/scenes). These are reference assets.
If a user references an image token, use it appropriately (as first frame, interpolation frame, or reference).

Rules:
- Default duration: 8 seconds unless user asks otherwise.
- Default resolution: 720p unless user asks for 1080p.
- Audio must be generated (generateAudio=true).
- Veo supports at most 3 reference images total.

When it's time to generate, call the tool generate_video_veo.`,
    tools: {
      generate_video_veo: tool({
        description:
          "Generate a video with Veo 3.1. Use @image-* references for frames/references when applicable.",
        inputSchema: z.object({
          prompt: z.string().min(1),
          mode: veoModeEnum.default("auto"),
          aspectRatio: z.enum(["16:9", "9:16"]).default("16:9"),
          durationSeconds: z
            .preprocess((v) => (typeof v === "number" ? String(v) : v), z.enum(["4", "6", "8"]).default("8"))
            .transform((v) => Number(v)),
          resolution: z.enum(["720p", "1080p"]).default("720p"),
          sampleCount: z.number().int().min(1).max(4).default(1),
          negativePrompt: z.string().optional(),
          firstFrame: z.string().optional().describe("Optional image label like image-1"),
          startFrame: z.string().optional().describe("Optional image label like image-1"),
          endFrame: z.string().optional().describe("Optional image label like image-2"),
          referenceImages: z.array(z.string()).optional().describe("Optional image labels like image-1"),
          maskMode: z.string().optional().describe("Optional mask mode string (e.g. add/remove) for inpaint"),
        }),
        execute: async (input) => {
          const ownerId = user.id;
          const videoId = randomUUID();
          const versionId = randomUUID();

          await db.insert(videos).values({
            id: videoId,
            userId: ownerId,
            projectId,
            title: null,
          });

          await db.insert(videoVersions).values({
            id: versionId,
            userId: ownerId,
            projectId,
            videoId,
            prompt: input.prompt,
            negativePrompt: input.negativePrompt ?? null,
            mode: input.mode,
            aspectRatio: input.aspectRatio,
            durationSeconds: input.durationSeconds as 4 | 6 | 8,
            resolution: input.resolution,
            generateAudio: true,
            sampleCount: input.sampleCount,
            request: input as any,
            status: "running",
            updatedAt: new Date(),
          });

          const location = process.env.GOOGLE_VERTEX_LOCATION ?? "us-central1";
          const vertexProjectId = process.env.GOOGLE_VERTEX_PROJECT ?? "";
          if (!vertexProjectId) throw new Error("Missing GOOGLE_VERTEX_PROJECT");

          const storageUri = `gs://vidnova_generated_videos/${ownerId}/${projectId}/${videoId}/${versionId}/`;

          const lastUserMessage = [...uiMessages].reverse().find((m: any) => m?.role === "user") ?? null;
          const mentionLabels = extractMentionsInOrder(
            `${input.prompt}\n${lastUserMessage ? getTextFromUiMessage(lastUserMessage) : ""}`,
          );

          const explicitRefs = input.referenceImages ?? [];
          const refWanted = Array.from(new Set([...explicitRefs, ...mentionLabels]));

          const referenceImages: Array<{ gcsUri: string; mimeType: string; referenceType: "asset" }> = [];
          const referencedElementIds: string[] = [];
          const referencedUploadIds: string[] = [];

          const pinnedTokens = [
            ...((referenceSet?.locked ?? []) as string[]),
            ...((referenceSet?.unlocked ?? []) as string[]),
          ].filter((t) => typeof t === "string" && t.length > 0);

          for (const token of pinnedTokens) {
            if (referenceImages.length >= 3) break;
            if (token.startsWith("asset:")) {
              const elementId = token.slice("asset:".length);
              if (!elementId) continue;
              referencedElementIds.push(elementId);
              const latest = await resolveElementLatestAsset({ elementId, userId: ownerId });
              if (!latest?.assetId) continue;
              const mirrored =
                latest.gcsUri && latest.mimeType
                  ? { gcsUri: latest.gcsUri, mimeType: latest.mimeType }
                  : await ensureAssetMirroredToGcs({
                      assetId: latest.assetId,
                      userId: ownerId,
                      projectId,
                    });

              referenceImages.push({
                gcsUri: mirrored.gcsUri,
                mimeType: mirrored.mimeType,
                referenceType: "asset",
              });
              continue;
            }
            if (token.startsWith("upload:")) {
              const uploadId = token.slice("upload:".length);
              if (!uploadId) continue;
              referencedUploadIds.push(uploadId);
              const mirrored = await ensureUploadMirroredToGcs({
                uploadId,
                userId: ownerId,
                projectId,
              });
              referenceImages.push({
                gcsUri: mirrored.gcsUri,
                mimeType: mirrored.mimeType,
                referenceType: "asset",
              });
            }
          }

          for (const label of refWanted) {
            if (referenceImages.length >= 3) break;

            const asset = assetRegistry[label];
            if (asset) {
              referencedElementIds.push(asset.elementId);
              const latest = await resolveElementLatestAsset({ elementId: asset.elementId, userId: ownerId });
              if (!latest?.assetId) continue;
              const mirrored =
                latest.gcsUri && latest.mimeType
                  ? { gcsUri: latest.gcsUri, mimeType: latest.mimeType }
                  : await ensureAssetMirroredToGcs({
                      assetId: latest.assetId,
                      userId: ownerId,
                      projectId,
                    });

              referenceImages.push({
                gcsUri: mirrored.gcsUri,
                mimeType: mirrored.mimeType,
                referenceType: "asset",
              });
              continue;
            }

            const ref = fileRegistry[label];
            if (ref?.uploadId) {
              referencedUploadIds.push(ref.uploadId);
              const mirrored = await ensureUploadMirroredToGcs({
                uploadId: ref.uploadId,
                userId: ownerId,
                projectId,
              });
              referenceImages.push({
                gcsUri: mirrored.gcsUri,
                mimeType: mirrored.mimeType,
                referenceType: "asset",
              });
            }
          }

          await db
            .update(videoVersions)
            .set({
              referenceAssetIds: Array.from(new Set(referencedElementIds)) as any,
              referenceImageIds: Array.from(new Set(referencedUploadIds)) as any,
              updatedAt: new Date(),
            })
            .where(eq(videoVersions.id, versionId));

          const resolveFrame = async (label?: string) => {
            if (!label) return null;
            const ref = fileRegistry[label];
            if (!ref?.uploadId) return null;
            const mirrored = await ensureUploadMirroredToGcs({
              uploadId: ref.uploadId,
              userId: ownerId,
              projectId,
            });
            return { gcsUri: mirrored.gcsUri, mimeType: mirrored.mimeType };
          };

          const image = await resolveFrame(input.mode === "image_to_video" ? input.firstFrame : input.startFrame);
          const lastFrame = await resolveFrame(input.mode === "frame_interpolation" ? input.endFrame : undefined);

          const inpaintRequested =
            input.mode === "inpaint" || (editContext?.mode === "inpaint" && Boolean(editContext?.maskUploadId));

          let video: { gcsUri: string; mimeType: string } | null = null;
          let mask: { gcsUri: string; mimeType: string; maskMode?: string } | null = null;

          if (inpaintRequested) {
            const [base] = await db
              .select()
              .from(videoVersions)
              .where(and(eq(videoVersions.projectId, projectId), eq(videoVersions.userId, ownerId), eq(videoVersions.status, "succeeded")))
              .orderBy(desc(videoVersions.createdAt))
              .limit(1);

            const gcsUri = (base?.outputGcsUris?.[0] as any as string | undefined) ?? null;
            if (!gcsUri) {
              throw new Error("Inpaint requires an existing generated video. Generate a video first.");
            }
            video = { gcsUri, mimeType: "video/mp4" };

            const maskUploadId = editContext?.maskUploadId ?? null;
            if (!maskUploadId) {
              throw new Error("Inpaint requires a mask image (maskUploadId).");
            }
            const mirroredMask = await ensureUploadMirroredToGcs({
              uploadId: maskUploadId,
              userId: ownerId,
              projectId,
            });
            mask = { gcsUri: mirroredMask.gcsUri, mimeType: mirroredMask.mimeType, maskMode: input.maskMode ?? "add" };
          }

          const operationName = await startVeoOperation({
            projectId: vertexProjectId,
            location,
            prompt: input.prompt,
            storageUri,
            aspectRatio: input.aspectRatio,
            durationSeconds: input.durationSeconds as 4 | 6 | 8,
            resolution: input.resolution,
            sampleCount: input.sampleCount,
            generateAudio: true,
            negativePrompt: input.negativePrompt,
            ...(image ? { image } : {}),
            ...(lastFrame ? { lastFrame } : {}),
            ...(referenceImages.length > 0 ? { referenceImages } : {}),
            ...(video ? { video } : {}),
            ...(mask ? { mask } : {}),
          });

          const jobId = randomUUID();
          await db.insert(videoJobs).values({
            id: jobId,
            userId: ownerId,
            projectId,
            videoVersionId: versionId,
            operationName,
            status: "running",
            request: {
              ...input,
              storageUri,
              operationName,
            } as any,
            updatedAt: new Date(),
          });

          const done = await pollVeoUntilDone({
            projectId: vertexProjectId,
            location,
            operationName,
            timeoutMs: 240_000,
            intervalMs: 6_000,
          });

          if (!done?.done) {
            return {
              status: "running",
              jobId,
              videoId,
              versionId,
              operationName,
              storageUri,
            };
          }

          const videosArr = (done?.response?.videos ?? []) as Array<{ gcsUri: string; mimeType: string }>;
          const gcsUris = videosArr.map((v) => v.gcsUri).filter(Boolean);
          const mimeTypes = videosArr.map((v) => v.mimeType).filter(Boolean);
          const previewUrls = await Promise.all(gcsUris.map((u) => signGcsUrl(u)));

          await db
            .update(videoJobs)
            .set({
              status: "succeeded",
              response: done as any,
              updatedAt: new Date(),
            })
            .where(eq(videoJobs.id, jobId));

          await db
            .update(videoVersions)
            .set({
              status: "succeeded",
              outputGcsUris: gcsUris as any,
              outputMimeTypes: mimeTypes as any,
              updatedAt: new Date(),
            })
            .where(eq(videoVersions.id, versionId));

          return {
            status: "succeeded",
            jobId,
            videoId,
            versionId,
            operationName,
            outputGcsUris: gcsUris,
            previewUrls,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
