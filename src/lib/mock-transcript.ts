import type { TranscriptSegment } from "./types";

/** Deterministic placeholder transcript when no API key — still drives UI and scoring heuristics. */
export function buildMockTranscript(seed: string, durationSec: number): TranscriptSegment[] {
  const lines: { speaker: "agent" | "customer"; text: string }[] = [
    {
      speaker: "agent",
      text: "Thanks for joining today. I'd love to understand what you're hoping to accomplish with your kitchen project.",
    },
    {
      speaker: "customer",
      text: "We're remodeling the full kitchen. We have a rough budget in mind and need clarity on cabinets and installation timing.",
    },
    {
      speaker: "agent",
      text: "That makes sense. Have you compared quotes from other suppliers yet?",
    },
    {
      speaker: "customer",
      text: "We have one competitor quote — their warranty terms were unclear, which worried us.",
    },
    {
      speaker: "agent",
      text: "I appreciate you sharing that. We can walk through cabinet styles and our warranty in detail. What's your ideal delivery timeline?",
    },
    {
      speaker: "customer",
      text: "We'd like installation before the holidays if possible — budget is flexible for the right quality.",
    },
    {
      speaker: "agent",
      text: "Great. I'll send an updated quote and design options from our catalog, and we can schedule a consultation to finalize scope.",
    },
    {
      speaker: "customer",
      text: "Please include the competitor comparison notes we discussed so we can review with my partner.",
    },
  ];

  const n = lines.length;
  const slice = durationSec / n;
  let t = 0;
  return lines.map((l, i) => {
    const segDur = Math.max(8, slice + (seed.charCodeAt(i % seed.length) % 7));
    const start = t;
    const end = Math.min(durationSec, t + segDur);
    t = end;
    return {
      speaker: l.speaker,
      text: l.text,
      startSec: start,
      endSec: end,
    };
  });
}
