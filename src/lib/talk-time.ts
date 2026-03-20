import type { TranscriptSegment } from "./types";

/**
 * Share of audio time per labeled speaker using segment [startSec, endSec].
 * Whisper assigns speakers alternately by segment, so this is still an estimate — but it
 * varies with real segment lengths instead of collapsing to ~50/50 word counts.
 */
export function talkTimePctFromSegments(segments: TranscriptSegment[]): {
  agentTalkPct: number;
  customerTalkPct: number;
} {
  let agentSec = 0;
  let customerSec = 0;
  for (const s of segments) {
    const len = Math.max(0, s.endSec - s.startSec);
    if (s.speaker === "agent") agentSec += len;
    else customerSec += len;
  }
  const sum = agentSec + customerSec;
  if (sum < 0.5) {
    return talkTimePctFromWordCount(segments);
  }
  const agentPct = Math.round((agentSec / sum) * 100);
  return {
    agentTalkPct: agentPct,
    customerTalkPct: 100 - agentPct,
  };
}

function talkTimePctFromWordCount(segments: TranscriptSegment[]): {
  agentTalkPct: number;
  customerTalkPct: number;
} {
  let agent = 0;
  let customer = 0;
  for (const s of segments) {
    const w = s.text.split(/\s+/).filter(Boolean).length;
    if (s.speaker === "agent") agent += w;
    else customer += w;
  }
  const t = agent + customer || 1;
  const a = Math.round((agent / t) * 100);
  return { agentTalkPct: a, customerTalkPct: 100 - a };
}
