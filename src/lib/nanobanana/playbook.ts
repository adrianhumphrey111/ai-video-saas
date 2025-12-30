import fs from "node:fs";
import path from "node:path";

type ExtractKey =
  | "headshot"
  | "identity_lock"
  | "product_photo"
  | "try_on"
  | "general_photoreal";

let cachedReadme: string | null = null;

function getReadmeText() {
  if (cachedReadme) return cachedReadme;
  const readmePath = path.join(process.cwd(), "awesome-nanobanana-pro", "README.md");
  cachedReadme = fs.readFileSync(readmePath, "utf8");
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
