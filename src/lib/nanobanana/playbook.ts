import fs from "node:fs";
import path from "node:path";

type ExtractKey =
  | "headshot"
  | "identity_lock"
  | "product_photo"
  | "try_on"
  | "general_photoreal";

let cachedReadme: string | null = null;

const BUILTIN_PLAYBOOK_EXCERPT = `This file vendors small excerpts from:
- Awesome Nano Banana Pro: https://github.com/ZeroLu/awesome-nanobanana-pro
- License: CC BY 4.0 https://creativecommons.org/licenses/by/4.0/

We only keep the minimal sections/phrasing needed by \`src/lib/nanobanana/playbook.ts\`
to assemble short "playbook snippets" for prompt composition.

---

### 1.7. Professional Headshot Creator
*Create a professional profile photo from a selfie*

**Prompt:**
\`\`\`text
"A professional, high-resolution profile photo, maintaining the exact facial structure, identity, and key features of the person in the input image. The subject is framed from the chest up, with ample headroom. The person looks directly at the camera. They are styled for a professional photo studio shoot, wearing a premium smart casual blazer in a subtle charcoal gray. The background is a solid '#562226' neutral studio color. Shot from a high angle with bright and airy soft, diffused studio lighting, gently illuminating the face and creating a subtle catchlight in the eyes, conveying a sense of clarity. Captured on an 85mm f/1.8 lens with a shallow depth of field, exquisite focus on the eyes, and beautiful, soft bokeh. Observe crisp detail on the fabric texture of the blazer, individual strands of hair, and natural, realistic skin texture. The atmosphere exudes confidence, professionalism, and approachability. Clean and bright cinematic color grading with subtle warmth and balanced tones, ensuring a polished and contemporary feel."
\`\`\`

---

### 4.1. Virtual Model Try-On
*Dresses a model in a specific garment while preserving fabric texture and lighting integration.*

**Prompt:**
\`\`\`text
Using Image 1 (the garment) and Image 2 (the model), create a hyper-realistic full-body fashion photo where the model is wearing the garment. Crucial Fit Details : The [T-shirt/Jacket] must drape naturally on the model's body, conforming to their posture and creating realistic folds and wrinkles . High-Fidelity Preservation : Preserve the original fabric texture, color, and any logos from Image 1 with extreme accuracy. Seamless Integration : Blend the garment into Image 2 by perfectly matching the ambient lighting, color temperature, and shadow direction . Photography Style : Clean e-commerce lookbook, shot on a Canon EOS R5 with a 50mm f/1.8 lens for a natural, professional look.
\`\`\`

---

### 4.2. Professional Product Photography
*Isolates products from messy backgrounds and places them in a high-end commercial studio setting.*

**Prompt:**
\`\`\`text
Identify the main product in the uploaded photo (automatically removing any hands holding it or messy background details). Recreate it as a premium e-commerce product shot . Subject Isolation : Cleanly extract the product, completely removing any fingers, hands, or clutter . Background : Place the product on a pure white studio background (RGB 255, 255, 255) with a subtle, natural contact shadow at the base to ground it. Lighting : Use soft, commercial studio lighting to highlight the product's texture and material. Ensure even illumination with no harsh glare. Retouching : Automatically fix any lens distortion, improve sharpness, and color-correct to make the product look brand new and professional .
\`\`\`

---

## Extra "style line" keywords (for snippet extraction)

Photorealistic
8k
HDR
Shallow depth of field
Soft, diffused three-point lighting
Natural skin texture
Visible pores
Fabric detail
85mm
35mm
`;

function tryReadTextFile(filePath: string) {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    return text.trim().length > 0 ? text : null;
  } catch {
    return null;
  }
}

function getReadmeText() {
  if (cachedReadme) return cachedReadme;

  const vendoredReadmePath = path.join(
    process.cwd(),
    "src",
    "lib",
    "nanobanana",
    "assets",
    "awesome-nanobanana-pro.README.md",
  );

  const legacySubrepoReadmePath = path.join(process.cwd(), "awesome-nanobanana-pro", "README.md");

  const text =
    tryReadTextFile(vendoredReadmePath) ??
    tryReadTextFile(legacySubrepoReadmePath) ??
    BUILTIN_PLAYBOOK_EXCERPT;

  cachedReadme = text;
  return cachedReadme;
}

function extractCodeBlockAfterHeading(readme: string, heading: string) {
  const idx = readme.indexOf(heading);
  if (idx === -1) return null;
  const slice = readme.slice(idx, idx + 20_000);
  const m = slice.match(/```(?:text|json)\n([\s\S]*?)```/);
  return m?.[1]?.trim() ?? null;
}

function extractLinesMatching(readme: string, patterns: RegExp[], maxLines = 24) {
  const lines = readme.split("\n");
  const picked: string[] = [];
  for (const line of lines) {
    if (patterns.some((p) => p.test(line))) {
      const cleaned = line.trim();
      if (cleaned.length > 0) picked.push(cleaned);
      if (picked.length >= maxLines) break;
    }
  }
  return picked.join("\n");
}

export function getNanoBananaPlaybookSnippets(args: {
  userGoal: string;
  maxChars?: number;
}) {
  const readme = getReadmeText();
  const goal = (args.userGoal ?? "").toLowerCase();

  const wanted: ExtractKey[] = ["general_photoreal", "identity_lock"];
  if (/\b(headshot|profile|linkedin|professional)\b/.test(goal)) wanted.unshift("headshot");
  if (/\b(product|packaging|logo|label|bottle|can|box|advert|ad)\b/.test(goal))
    wanted.unshift("product_photo");
  if (/\b(try[- ]?on|wearing|garment|dress|outfit|fashion)\b/.test(goal)) wanted.unshift("try_on");

  const blocks: Partial<Record<ExtractKey, string>> = {
    headshot:
      extractCodeBlockAfterHeading(readme, "### 1.7. Professional Headshot Creator") ?? undefined,
    product_photo:
      extractCodeBlockAfterHeading(readme, "### 4.2. Professional Product Photography") ?? undefined,
    try_on: extractCodeBlockAfterHeading(readme, "### 4.1. Virtual Model Try-On") ?? undefined,
    identity_lock: extractLinesMatching(readme, [/Keep the facial features/i, /maintaining the exact facial/i]),
    general_photoreal: extractLinesMatching(readme, [
      /\bPhotorealistic\b/i,
      /\b8k\b/i,
      /\bshallow depth of field\b/i,
      /\bHDR\b/i,
      /\bskin texture\b/i,
      /\bpores\b/i,
      /\bfabric\b/i,
      /\b85mm\b/i,
      /\b35mm\b/i,
      /\bthree-point\b/i,
      /\bsoft(?:,|\s)diffused\b/i,
    ]),
  };

  const out: string[] = [];
  for (const k of wanted) {
    const v = blocks[k];
    if (!v) continue;
    out.push(`## ${k}\n${v}`);
  }

  const joined = out.join("\n\n").trim();
  const maxChars = args.maxChars ?? 2200;
  return joined.length > maxChars ? `${joined.slice(0, maxChars)}\n…` : joined;
}
