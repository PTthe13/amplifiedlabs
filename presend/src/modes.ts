export type Mode = "email" | "linkedin" | "proposal" | "feedback" | "general";

export const MODES: Record<Mode, { label: string; rules: string }> = {
  email: {
    label: "Email",
    rules: `Check categories for EMAIL:
- Structure (subject line if detectable, opening, body, close)
- Implied commitments (phrases like "I'll sort it out", "I'll handle it", "leave it with me" that read as firm promises)
- Tone vs. relationship (too formal/informal for the recipient described)
- Ambiguity (vague timeframes like "soon", "shortly"; unclear ownership; missing next steps)
- Emotional charge (frustration, passive-aggressive markers)
- Length appropriateness (too long for the ask, or too curt)`,
  },
  linkedin: {
    label: "LinkedIn",
    rules: `Check categories for LINKEDIN POST:
- Hook strength (first line — most important; will it stop the scroll?)
- Professional tone
- Authenticity (flag corporate jargon, buzzwords like "synergy", "leverage", "circle back")
- Call to action clarity
- Oversharing / personal risk (career-damaging admissions, NDA risk)
- Reach potential (does it invite engagement? questions, hot takes, specifics)`,
  },
  proposal: {
    label: "Proposal",
    rules: `Check categories for PROPOSAL:
- Clarity of the offer (what exactly is being proposed)
- Risk or liability language (open-ended commitments, missing scope guards)
- Pricing signals (vague = bad, specific = good)
- Professionalism (typos, formatting tone)
- Missing sections (timeline, deliverables, next steps, payment terms)`,
  },
  feedback: {
    label: "Feedback / Performance review",
    rules: `Check categories for FEEDBACK / PERFORMANCE REVIEW:
- Specificity (vague feedback like "be more proactive" is a red flag — needs examples)
- Bias indicators (gendered language, personality-based vs. behavior-based critique, assumptions)
- Balance (only negative or only positive = flag)
- Actionability (can the recipient actually act on this?)
- Tone (punishing vs. developmental)`,
  },
  general: {
    label: "General",
    rules: `Check categories for GENERAL message:
- Tone appropriateness
- Clarity of ask or intent
- Length vs. content ratio
- Potential misreads (ambiguity, sarcasm that won't land, missing context)`,
  },
};

export function modeRules(mode: Mode): string {
  return MODES[mode].rules;
}

export function modeLabel(mode: Mode): string {
  return MODES[mode].label;
}
