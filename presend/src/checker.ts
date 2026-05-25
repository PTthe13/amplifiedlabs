import Anthropic from "@anthropic-ai/sdk";
import { Mode, modeRules, modeLabel } from "./modes.js";
import { Profile, getProfile } from "./profiles.js";

const MODEL = "claude-sonnet-4-20250514";

export interface Flag {
  level: "red" | "yellow" | "green";
  code: string;
  message: string;
}

export interface Analysis {
  score: number;
  flags: Flag[];
  summary: string;
}

function client(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY not set. Add it to .env or your environment.",
    );
  }
  return new Anthropic({ apiKey: key });
}

function profileBlock(profile?: Profile): string {
  if (!profile) return "";
  return `\n\nRECIPIENT/PROFILE CONTEXT (id=${profile.id}, name=${profile.name}${profile.language ? `, lang=${profile.language}` : ""}):\n${profile.description}`;
}

function contextBlock(ctx?: string): string {
  if (!ctx) return "";
  return `\n\nADDITIONAL CONTEXT:\n${ctx}`;
}

function systemPrompt(mode: Mode, profile?: Profile, ctx?: string): string {
  return `You are presend, a "should I send this?" communication checker.

Task: analyze the user-supplied message and return a JSON verdict ONLY.

Mode: ${modeLabel(mode)}

${modeRules(mode)}
${profileBlock(profile)}${contextBlock(ctx)}

Rules:
- Auto-detect the language of the input message. ALL "message" fields in flags and the "summary" MUST be written in that same detected language. Flag "code" stays in English (uppercase snake case).
- Score 0–10, one decimal place. 10 = perfect, send as is. 0 = do not send.
- Flag levels: "red" = critical issue, "yellow" = consider, "green" = positive observation worth noting.
- Be concrete. Quote specific words/phrases from the message where useful.
- Max 6 flags total. Prefer the most important ones.
- Output strict JSON with this shape, no markdown fences, no prose:

{
  "score": number,
  "flags": [
    { "level": "red" | "yellow" | "green", "code": "UPPER_SNAKE_CASE", "message": "..." }
  ],
  "summary": "one line overall take in detected language"
}`;
}

function extractJson(text: string): Analysis {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Model returned no JSON object");
  const slice = cleaned.slice(start, end + 1);
  const data = JSON.parse(slice);
  if (typeof data.score !== "number" || !Array.isArray(data.flags)) {
    throw new Error("Malformed analysis JSON");
  }
  return data as Analysis;
}

export async function analyze(input: {
  text: string;
  mode: Mode;
  context?: string;
  profile_id?: string;
}): Promise<Analysis> {
  const profile = input.profile_id ? getProfile(input.profile_id) : undefined;
  const c = client();
  const res = await c.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt(input.mode, profile, input.context),
    messages: [{ role: "user", content: input.text }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text response");
  return extractJson(block.text);
}

function levelIcon(l: Flag["level"]): string {
  return l === "red" ? "🔴" : l === "yellow" ? "🟡" : "✅";
}

export function formatAnalysis(
  analysis: Analysis,
  mode: Mode,
  profile?: Profile,
): string {
  const header = `SCORE: ${analysis.score.toFixed(1)}/10 [Mode: ${modeLabel(mode)}${profile ? ` → ${profile.name}` : ""}]`;
  const flagLines = analysis.flags
    .map((f) => `${levelIcon(f.level)} ${f.code.replace(/_/g, " ")} — ${f.message}`)
    .join("\n");
  const tail = analysis.flags.some((f) => f.level === "red" || f.level === "yellow")
    ? "\n\n💡 Want a corrected version? Call: fix_message"
    : "";
  return `${header}\n\n${flagLines}\n\n${analysis.summary}${tail}`;
}

export async function rewrite(input: {
  text: string;
  flags: string;
  mode: Mode;
  context?: string;
  profile_id?: string;
}): Promise<string> {
  const profile = input.profile_id ? getProfile(input.profile_id) : undefined;
  const c = client();
  const system = `You are presend's fix_message worker.

Mode: ${modeLabel(input.mode)}
${modeRules(input.mode)}
${profileBlock(profile)}${contextBlock(input.context)}

Rules:
- Apply the flags below to produce a corrected version of the original message.
- Detect the original language and respond in the SAME language.
- Output ONLY the corrected message. No preamble. No "Here is...". No quotes around it.
- If a change is non-obvious, append a single short line at the end starting with "— note:" explaining it. Otherwise no explanation.
- Preserve the author's voice. Do not over-formalize.

FLAGS TO ADDRESS:
${input.flags}`;
  const res = await c.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: input.text }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text response");
  return block.text.trim();
}
