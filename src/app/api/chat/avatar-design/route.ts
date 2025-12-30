import { google } from "@ai-sdk/google";
import { vertex } from "@/lib/vertex";
import {
  convertToModelMessages,
  generateImage,
  generateText,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import { z } from "zod";
import { db } from "@/server/db";
import {
  avatars,
  avatarGenerations,
  assets,
  elements,
  elementVersions,
} from "@/server/db/schema";
import { nanoid } from "nanoid";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { and, desc, eq } from "drizzle-orm";
import { composeNanoBananaProPrompt } from "@/lib/nanobanana/prompt-composer";

export const maxDuration = 60;

const generateAvatarSchema = z.object({
  prompt: z
    .string()
    .describe(
      "A short user goal is OK; the system will compose a professional prompt automatically.",
    ),
  aspect_ratio: z
    .enum(["1:1", "9:16", "16:9"])
    .default("9:16")
    .describe("The aspect ratio of the generated image."),
});

function isUuid(val: string | null | undefined) {
  if (!val) return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    val,
  );
}

type NanoBananaEngine = "nano-banana-2.5" | "nano-banana-3";

function resolveImageVertexModel(engine: string | null | undefined) {
  const normalized = (engine ?? "").trim().toLowerCase() as NanoBananaEngine;
  switch (normalized) {
    case "nano-banana-3":
      return "gemini-3-pro-image-preview";
    case "nano-banana-2.5":
    default:
      return "gemini-2.5-flash-image";
  }
}

function extractReferencedImageIds(text: string) {
  const matches = text.match(/@image-\d+/g) ?? [];
  const ids = matches.map((m) => m.slice(1));
  return Array.from(new Set(ids));
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

function getImageIdsFromParts(parts: any[]) {
  let lastLabel: string | null = null;
  const ids: string[] = [];
  for (const part of parts) {
    if (part?.type === "text" && typeof part.text === "string") {
      const t = part.text.trim();
      if (/^@image-\d+$/.test(t)) lastLabel = t.slice(1);
    } else if (part?.type === "file") {
      const id = (typeof part.imageId === "string" && part.imageId) || lastLabel;
      if (id) ids.push(id);
      lastLabel = null;
    }
  }
  return ids;
}

function buildImageRegistry(uiMessages: any[]) {
  const registry: Record<string, { url: string; mediaType?: string }> = {};
  for (const m of uiMessages) {
    const parts = Array.isArray(m?.parts) ? m.parts : [];
    let lastLabel: string | null = null;
    for (const part of parts) {
      if (part?.type === "text" && typeof part.text === "string") {
        const t = part.text.trim();
        if (/^@image-\d+$/.test(t)) lastLabel = t.slice(1);
      } else if (part?.type === "file") {
        const id = (typeof part.imageId === "string" && part.imageId) || lastLabel;
        if (id && typeof part.url === "string" && part.url.length > 0) {
          registry[id] = { url: part.url, mediaType: part.mediaType ?? part.contentType };
        }
        lastLabel = null;
      }
    }
  }
  return registry;
}

async function getElementAssetSignedUrl(args: {
  elementId: string;
  versionId?: string | null;
  userId: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}) {
  const [row] = await db
    .select({
      storagePath: assets.storagePath,
      mimeType: assets.mimeType,
    })
    .from(elementVersions)
    .leftJoin(assets, eq(assets.id, elementVersions.assetId))
    .where(
      args.versionId
        ? and(
            eq(elementVersions.id, args.versionId),
            eq(elementVersions.elementId, args.elementId),
          )
        : eq(elementVersions.elementId, args.elementId),
    )
    .orderBy(desc(elementVersions.versionNumber))
    .limit(1);

  const storagePath = row?.storagePath ?? null;
  const mimeType = row?.mimeType ?? null;
  if (!storagePath || !mimeType) return null;

  // Basic ownership check: element belongs to user.
  const [ownerRow] = await db
    .select({ userId: elements.userId })
    .from(elements)
    .where(eq(elements.id, args.elementId))
    .limit(1);
  if (!ownerRow || ownerRow.userId !== args.userId) return null;

  const { data, error } = await args.supabase.storage
    .from("user-uploads")
    .createSignedUrl(storagePath, 60 * 60);
  if (error || !data?.signedUrl) return null;

  return { url: data.signedUrl, mediaType: mimeType };
}

async function upsertElementVersion(opts: {
  elementId?: string | null;
  parentVersionId?: string | null;
  userId: string;
  kind?: "character" | "object" | "other";
  name?: string | null;
  summary?: string | null;
  publicUrl: string;
  storagePath: string;
  mimeType: string;
  prompt?: string | null;
  diffInstruction?: string | null;
  source: "generate" | "edit" | "upload" | "import";
}) {
  const elementId = opts.elementId ?? randomUUID();
  const kind = opts.kind ?? "character";

  // Ensure element exists (kind defaults to character for avatar flow)
  await db
    .insert(elements)
    .values({
      id: elementId,
      userId: opts.userId,
      kind,
      name: opts.name ?? "New Character",
      summary: opts.summary ?? null,
      status: "draft",
    })
    .onConflictDoNothing();

  // Insert asset
  const [asset] = await db
    .insert(assets)
    .values({
      userId: opts.userId,
      storagePath: opts.storagePath,
      publicUrl: opts.publicUrl,
      mimeType: opts.mimeType,
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
  const parentVersionId = opts.parentVersionId ?? latest?.id ?? null;

  const [version] = await db
    .insert(elementVersions)
    .values({
      elementId,
      versionNumber: nextVersionNumber,
      parentVersionId,
      status: "ready",
      source: opts.source,
      prompt: opts.prompt ?? undefined,
      diffInstruction: opts.diffInstruction ?? undefined,
      attributes: {},
      assetId: asset.id,
      createdBy: opts.userId,
    })
    .returning();

  await db
    .update(elements)
    .set({
      latestVersionId: version.id,
      thumbnailUrl: asset.publicUrl,
      status: "ready",
      updatedAt: new Date(),
    })
    .where(eq(elements.id, elementId));

  return { elementId, versionId: version.id, assetPublicUrl: asset.publicUrl };
}

export async function POST(req: Request) {
  const {
    messages,
    avatarId: existingAvatarIdRaw,
    elementId: existingElementIdRaw,
    currentVersionId: currentVersionIdRaw,
    currentImage,
    currentPrompt,
    elementName,
    elementKind,
    model: requestedModel,
  }: {
    messages: any[];
    avatarId?: string;
    elementId?: string;
    currentVersionId?: string;
    currentImage: string;
    currentPrompt?: string | null;
    elementName?: string | null;
    elementKind?: "character" | "object" | "other" | null;
    model?: string | null;
  } =
    await req.json();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Not authenticated" }),
      { status: 401 },
    );
  }

  const existingElementId = existingElementIdRaw || null;
  const existingAvatarId = existingAvatarIdRaw || existingElementId;
  const currentVersionId =
    currentVersionIdRaw && isUuid(currentVersionIdRaw) ? currentVersionIdRaw : null;
  const ownerId = user.id;

  let resolvedElementKind: "character" | "object" | "other" | undefined =
    elementKind ?? undefined;
  let resolvedElementName: string | undefined = elementName ?? undefined;

  if (existingElementId && isUuid(existingElementId)) {
    const [row] = await db
      .select({
        id: elements.id,
        userId: elements.userId,
        kind: elements.kind,
        name: elements.name,
      })
      .from(elements)
      .where(eq(elements.id, existingElementId))
      .limit(1);
    if (row) {
      if (row.userId !== ownerId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
      }
      resolvedElementKind = row.kind as any;
      resolvedElementName = row.name ?? undefined;
    }
  }

  console.log("currentImage", currentImage);
  // IMPORTANT: The orchestrator model must support tool/function calling.
  const orchestratorModelId = "gemini-3-pro-preview";
  // The image model is user-selectable and used only inside image generation/edit tools.
  const imageModelId = resolveImageVertexModel(requestedModel);
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: vertex(orchestratorModelId),
    messages: modelMessages,
    stopWhen: stepCountIs(10),
    system: `You are an expert AI Avatar Designer for 'VidNova'.
Your goal is to help users create the perfect digital avatar.
You have access to:
1. 'generate_avatar': Use this for INITIAL generation or when the user wants a completely NEW concept.
2. 'edit_generated_avatar': Use this when the user wants to MODIFY an existing avatar (e.g., "add a hat", "make her smile", "change the background"). This requires an existing avatar.

Reference images:
- Users may attach images and reference them in text as @image-1, @image-2, etc (in the order attached).
- When the user references @image-N, use that image as a visual reference for your edits/generation prompts.

Process:
1. Discuss the user's vision.
2. If clear/agreed, call the appropriate tool.
3. After generating/editing, ask for feedback.

Context:
- If currentImage is provided, EDIT that image; do not create a new subject unless explicitly requested.
- Existing prompt (if any): ${currentPrompt || "none provided"}
 - Element: ${resolvedElementName || "unnamed"} (${resolvedElementKind || "unknown kind"})
`,
    onFinish: async (event: any) => {
      if (user) {
        try {
          // Try to find the avatarId: either existing or from a tool result in this run
          let id = existingAvatarId;

          if (!id && event.toolResults) {
            const avatarToolResult = event.toolResults.find(
              (r: any) =>
                r.toolName === "generate_avatar" || r.toolName === "edit_generated_avatar",
            );
            if (avatarToolResult?.result?.avatarId) {
              id = avatarToolResult.result.avatarId;
            }
            if (!id && avatarToolResult?.result?.elementId) {
              id = avatarToolResult.result.elementId;
            }
          }

          if (id && ownerId) {
            const finishMessages = event.messages || [];
            await db
              .insert(avatars)
              .values({
                id,
                userId: ownerId,
                name: "Design Session",
                status: "ready",
              })
              .onConflictDoNothing();

            await db
              .update(avatars)
              .set({
                promptHistory: [...messages, ...finishMessages] as any,
                updatedAt: new Date(),
              })
              .where(eq(avatars.id, id));
          }
        } catch (err) {
          console.error("Failed to save history:", err);
        }
      }
    },
    tools: {
      generate_avatar: tool({
        description: "Generates a NEW avatar image from scratch based on a description.",
        inputSchema: generateAvatarSchema,
        execute: async ({ prompt }: { prompt: string; aspect_ratio: string }) => {
          const registry = buildImageRegistry(messages);
          const lastUserMessage = [...messages].reverse().find((m: any) => m?.role === "user") ?? null;
          const lastUserText = lastUserMessage ? getTextFromUiMessage(lastUserMessage) : "";
          const referenced = extractReferencedImageIds(lastUserText);
          const fallbackIds =
            lastUserMessage && Array.isArray(lastUserMessage.parts)
              ? getImageIdsFromParts(lastUserMessage.parts)
              : [];
          const idsToUse = referenced.length > 0 ? referenced : fallbackIds;
          const imagesToUse = idsToUse
            .map((id) => registry[id])
            .filter((img): img is { url: string; mediaType?: string } => Boolean(img?.url));

          const composed = await composeNanoBananaProPrompt({
            userGoal: prompt,
            elementName: resolvedElementName ?? null,
            elementKind: resolvedElementKind ?? null,
            currentPrompt: currentPrompt ?? null,
            hasBaseImage: Boolean(currentImage),
            referenceImageCount: imagesToUse.length,
          });

          const promptText = composed.negativePrompt
            ? `${composed.finalPrompt}\n\nNegative prompt: ${composed.negativePrompt}`
            : composed.finalPrompt;

          const result = await generateText({
            model: vertex(imageModelId),
            prompt:
              imagesToUse.length > 0
                ? [
                    {
                      role: "user",
                      content: [
                        { type: "text", text: promptText },
                        ...imagesToUse.map((img) => ({
                          type: "image" as const,
                          image: new URL(img.url),
                          mediaType: img.mediaType ?? "image/png",
                        })),
                      ],
                    },
                  ]
                : promptText,
          });

          let imageUrl = "https://mkt.cdnpk.net/web-app/media/freepik-9-2000.webp"; // Fallback

          // Handle generated image
          const file = result.files.find((f) => f.mediaType.startsWith("image/"));
          if (file && ownerId) {
            try {
              const fileName = `${nanoid()}.png`;
              const storagePath = `${ownerId}/${fileName}`;

              // Upload to Supabase Storage
              const { error: uploadError } = await supabase.storage
                .from("user-uploads")
                .upload(storagePath, file.uint8Array, {
                  contentType: file.mediaType,
                  upsert: true,
                });

              if (uploadError) throw uploadError;

              // Get Signed URL (1 hour) for immediate UI display
              const { data, error: signedError } = await supabase.storage
                .from("user-uploads")
                .createSignedUrl(storagePath, 3600);

              if (signedError) throw signedError;

              // Also get Public URL for DB persistence (may be private; used with signing on read)
              const {
                data: { publicUrl },
              } = supabase.storage.from("user-uploads").getPublicUrl(storagePath);

              imageUrl = data.signedUrl;
              const dbImageUrl = publicUrl;

              const elementId =
                (isUuid(existingElementId) && existingElementId) ||
                (isUuid(existingAvatarId) && existingAvatarId) ||
                randomUUID();

              const { elementId: savedElementId, versionId } = await upsertElementVersion({
                elementId,
                userId: ownerId,
                kind: resolvedElementKind ?? "character",
                name: existingElementId ? resolvedElementName : "AI Generated",
                publicUrl: dbImageUrl,
                storagePath,
                mimeType: file.mediaType,
                prompt: promptText,
                source: "generate",
              });

              return {
                success: true,
                imageUrl,
                elementId: savedElementId,
                versionId,
                promptUsed: promptText,
                promptPlan: composed,
              };
            } catch (err) {
              console.error("Storage Error:", err);
            }
          }

          return {
            success: true,
            imageUrl: imageUrl,
            elementId: existingElementId || null,
          };
        },
      } as any),
      edit_generated_avatar: tool({
        description:
          "Edits an EXISTING avatar image. Use this for modifications like adding accessories or changing specific features. Do not change anything that the user does not ask you to change, so keep the scene and the character the same unless the ask you to change a specific aspect of the scene or character.",
        inputSchema: z.object({
          instruction: z
            .string()
            .describe("What to change in the image (e.g., 'Add a wizard hat')."),
        }),
        execute: async ({ instruction }: { instruction: string }) => {
          if (!user) return { success: false, error: "Not authenticated" };

          const baseSigned = existingElementId
            ? await getElementAssetSignedUrl({
                elementId: existingElementId,
                versionId: currentVersionId,
                userId: ownerId,
                supabase,
              })
            : null;

          const baseImageUrl = baseSigned?.url ?? currentImage;
          const baseMediaType = baseSigned?.mediaType ?? "image/png";

          if (!baseImageUrl) {
            return { success: false, error: "No base image found to edit. Please generate one first." };
          }

          // Perform Edit
          const registry = buildImageRegistry(messages);
          const lastUserMessage = [...messages].reverse().find((m: any) => m?.role === "user") ?? null;
          const lastUserText = lastUserMessage ? getTextFromUiMessage(lastUserMessage) : "";
          const referenced = Array.from(
            new Set([
              ...extractReferencedImageIds(instruction),
              ...extractReferencedImageIds(lastUserText),
            ]),
          );
          const fallbackIds =
            lastUserMessage && Array.isArray(lastUserMessage.parts)
              ? getImageIdsFromParts(lastUserMessage.parts)
              : [];
          const idsToUse = referenced.length > 0 ? referenced : fallbackIds;

          const imagesToUse = idsToUse
            .map((id) => registry[id])
            .filter((img): img is { url: string; mediaType?: string } => Boolean(img?.url));

          const composed = await composeNanoBananaProPrompt({
            userGoal: instruction,
            elementName: resolvedElementName ?? null,
            elementKind: resolvedElementKind ?? null,
            currentPrompt: currentPrompt ?? null,
            hasBaseImage: true,
            referenceImageCount: imagesToUse.length + 1,
          });

          const promptText =
            (composed.negativePrompt
              ? `${composed.finalPrompt}\n\nNegative prompt: ${composed.negativePrompt}`
              : composed.finalPrompt) + `\n\nEdit request (must apply precisely): ${instruction}`;

          const result = await generateText({
            model: vertex(imageModelId),
            prompt: [
              {
                role: "user",
                content: [
                  { type: "text", text: promptText },
                  // Put the base image first to strongly anchor identity/composition,
                  // then provide optional extra references (product, background, etc).
                  { type: "image", image: new URL(baseImageUrl), mediaType: baseMediaType },
                  ...imagesToUse.map((img) => ({
                    type: "image" as const,
                    image: new URL(img.url),
                    mediaType: img.mediaType ?? "image/png",
                  })),
                ],
              },
            ],
          });

          let imageUrl = baseImageUrl; // Start with base

          // Handle generated image (same upload logic as generate)
          const file = result.files.find((f) => f.mediaType.startsWith("image/"));
          if (file && ownerId) {
            try {
              const fileName = `edited-${nanoid()}.png`;
              const storagePath = `${ownerId}/${fileName}`;

              const { error: uploadError } = await supabase.storage
                .from("user-uploads")
                .upload(storagePath, file.uint8Array, {
                  contentType: file.mediaType,
                  upsert: true,
                });

              if (uploadError) throw uploadError;

              const { data, error: signedError } = await supabase.storage
                .from("user-uploads")
                .createSignedUrl(storagePath, 3600);

              if (signedError) throw signedError;

              // Get Public URL for DB persistence
              const {
                data: { publicUrl },
              } = supabase.storage.from("user-uploads").getPublicUrl(storagePath);

              imageUrl = data.signedUrl;
              const dbImageUrl = publicUrl;

              const avatarId = existingAvatarId || nanoid();
              const elementId =
                (isUuid(existingElementId) && existingElementId) ||
                (isUuid(existingAvatarId) && existingAvatarId) ||
                randomUUID();

              const { elementId: savedElementId, versionId } = await upsertElementVersion({
                elementId,
                parentVersionId: currentVersionId,
                userId: ownerId,
                kind: resolvedElementKind ?? "character",
                name: existingElementId ? resolvedElementName : "AI Edited",
                publicUrl: dbImageUrl,
                storagePath,
                mimeType: file.mediaType,
                prompt: promptText,
                diffInstruction: instruction,
                source: "edit",
              });

              return {
                success: true,
                imageUrl,
                elementId: savedElementId,
                versionId,
                promptUsed: promptText,
                promptPlan: composed,
              };
            } catch (err) {
              console.error("Storage/DB Error in edit:", err);
            }
          }

          return {
            success: true,
            imageUrl,
            elementId: existingElementId,
          };
        },
      } as any),
    },
  });

  return (result as any).toUIMessageStreamResponse();
}
