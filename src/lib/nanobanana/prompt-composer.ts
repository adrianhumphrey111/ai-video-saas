import { generateObject } from "ai";
import { z } from "zod";

import { vertex } from "@/lib/vertex";
import { getNanoBananaPlaybookSnippets } from "@/lib/nanobanana/playbook";

export const nanoBananaPromptPlanSchema = z.object({
  intent: z
    .enum([
      "avatar_portrait",
      "talking_head_social",
      "product_photo_studio",
      "product_in_scene",
      "fashion_try_on",
      "other",
    ])
    .describe("High-level intent for the image."),
  finalPrompt: z
    .string()
    .min(1)
    .describe("Final prompt to send to the image model (plain text, no JSON)."),
  negativePrompt: z
    .string()
    .optional()
    .describe("Optional negative prompt. Keep short and specific."),
  checklist: z
    .array(z.string())
    .optional()
    .describe("Optional quick checklist of fidelity constraints included in the prompt."),
});

export type NanoBananaPromptPlan = z.infer<typeof nanoBananaPromptPlanSchema>;

export async function composeNanoBananaProPrompt(args: {
  userGoal: string;
  elementName?: string | null;
  elementKind?: string | null;
  currentPrompt?: string | null;
  hasBaseImage?: boolean;
  referenceImageCount?: number;
}) {
  const playbook = getNanoBananaPlaybookSnippets({ userGoal: args.userGoal });

  const system = `You are VidNova's "Nano Banana Prompt Composer".
Your job: take a user's plain request and produce a SINGLE best-in-class photoreal prompt for Nano Banana (Gemini image models).

Constraints:
- Output MUST be plain English prompt text (not JSON) in finalPrompt.
- Use the playbook patterns below as guidance (vendored excerpts from awesome-nanobanana-pro).
- Prioritize: identity consistency, believable lighting, correct lens/composition, product fidelity when relevant.
- Avoid unsafe or disallowed content; keep professional.

How to write great prompts (key ideas):
- If a base face/image is provided, explicitly say: keep identity/facial structure exactly consistent.
- Use camera + lens cues (35mm/50mm/85mm, shallow DoF) and a lighting setup (soft diffused studio, three-point, golden hour).
- For product: preserve logo/label/packaging exactly, no warping, readable text, natural contact shadows, matched lighting direction.
- Prefer concise but specific. Do not ramble.

Playbook snippets:
${playbook}`;

  const user = `User request: ${args.userGoal}
Context:
- Element: ${args.elementName ?? "unknown"} (${args.elementKind ?? "unknown kind"})
- Has base image: ${args.hasBaseImage ? "yes" : "no"}
- Reference images attached: ${args.referenceImageCount ?? 0}
- Existing prompt (if any): ${args.currentPrompt ?? "none"}`;

  const plan = await generateObject({
    model: vertex("gemini-3-pro-preview"),
    schema: nanoBananaPromptPlanSchema,
    system,
    prompt: user,
    temperature: 0.4,
  });

  return plan.object;
}
