import { modeRules, modeLabel } from "./modes.js";
import { getProfile } from "./profiles.js";
function profileBlock(profile) {
    if (!profile)
        return "";
    return `\n\nRECIPIENT/PROFILE CONTEXT (id=${profile.id}, name=${profile.name}${profile.language ? `, lang=${profile.language}` : ""}):\n${profile.description}`;
}
function contextBlock(ctx) {
    if (!ctx)
        return "";
    return `\n\nADDITIONAL CONTEXT:\n${ctx}`;
}
/**
 * Build the analysis instruction. The MCP server returns this text; the host
 * LLM (the model the user is talking to) reads it on its next turn and
 * performs the analysis inline. No sampling, no separate API calls.
 */
export function buildCheckInstruction(input) {
    const profile = input.profile_id ? getProfile(input.profile_id) : undefined;
    const header = `[presend] Analyze the message below before the user sends it.

Mode: ${modeLabel(input.mode)}

${modeRules(input.mode)}${profileBlock(profile)}${contextBlock(input.context)}

Instructions for you (the assistant):
- Detect the language of the message and respond in that same language.
- Be concrete. Quote specific words/phrases from the message when calling out issues.
- Score it 0-10 with one decimal (10 = send as is, 0 = do not send).
- Identify up to 6 flags. Levels: red (critical), yellow (consider), green (positive trait worth noting).
- Render the result EXACTLY in this format (markdown table, no JSON, no code fences):

**SCORE: X.X/10** — Mode: ${modeLabel(input.mode)}${profile ? ` → ${profile.name}` : ""}

| Level | Flag | Detail |
|---|---|---|
| 🔴 | FLAG_CODE | short explanation |
| 🟡 | FLAG_CODE | short explanation |
| ✅ | FLAG_CODE | short explanation |

**Summary:** <one-line overall take>

💡 Want a corrected version? Ask: fix_message

Use 🔴 for red, 🟡 for yellow, ✅ for green. Flag codes UPPER_SNAKE_CASE in English; the "Detail" column and "Summary" line in the detected language. Drop the final "💡" line only if there are zero red or yellow flags. Keep table pipes aligned but content terse.

=== MESSAGE TO ANALYZE ===
${input.text}
=== END MESSAGE ===`;
    return header;
}
export function buildFixInstruction(input) {
    const profile = input.profile_id ? getProfile(input.profile_id) : undefined;
    return `[presend] Rewrite the message below applying the flags.

Mode: ${modeLabel(input.mode)}

${modeRules(input.mode)}${profileBlock(profile)}${contextBlock(input.context)}

FLAGS TO ADDRESS:
${input.flags}

Instructions for you (the assistant):
- Detect the message's language and rewrite in the SAME language.
- Apply the flags. Preserve the author's voice. Do not over-formalize.
- Output ONLY the corrected message. No preamble, no "Here is...", no quotes around it.
- If a change is non-obvious, append ONE short line starting with "— note:" at the end. Otherwise no explanation.

=== ORIGINAL MESSAGE ===
${input.text}
=== END MESSAGE ===`;
}
