import { createReadStream } from "fs";
import fs from "fs/promises";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { estimateDurationFromFileSizeBytes, getAudioDurationSec } from "./audio-duration";
import { DISCOVERY_TOPICS } from "./questionnaire";
import { analyzeFromTranscript } from "./heuristic-analysis";
import { talkTimePctFromSegments } from "./talk-time";
import { buildMockTranscript } from "./mock-transcript";
import type { CallAnalysis, CallRecord, TranscriptSegment } from "./types";
import { newId } from "./id";

function pathForStoredAudio(id: string, originalFilename: string): string {
  const ext = originalFilename.includes(".") ? originalFilename.split(".").pop()! : "webm";
  return `uploads/${id}.${ext}`;
}

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function whisperFilename(originalFilename: string): string {
  const base = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_") || "recording";
  if (/\.\w{2,4}$/i.test(base)) return base;
  return `${base}.webm`;
}

async function transcribeOpenAI(
  audioPath: string,
  durationSecEstimate: number,
  originalFilename: string,
): Promise<TranscriptSegment[]> {
  const client = getClient();
  if (!client) {
    return buildMockTranscript(audioPath, durationSecEstimate);
  }
  try {
    const file = await toFile(createReadStream(audioPath), whisperFilename(originalFilename), {
      type: "application/octet-stream",
    });
    const res = (await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    })) as unknown as {
      segments?: { start: number; end: number; text: string }[];
      text?: string;
    };

    const segments = res.segments;
    if (segments?.length) {
      return segments.map((s, i) => ({
        speaker: i % 2 === 0 ? ("agent" as const) : ("customer" as const),
        text: s.text.trim(),
        startSec: s.start,
        endSec: s.end,
      }));
    }
    const fallbackText = res.text ?? "";
    const parts = fallbackText.split(/\n+/).filter(Boolean);
    if (parts.length === 0) {
      throw new Error("Whisper returned no text. Check audio format (mp3, wav, webm, m4a) and file size.");
    }
    const slice = durationSecEstimate / parts.length;
    return parts.map((text, i) => ({
      speaker: i % 2 === 0 ? ("agent" as const) : ("customer" as const),
      text,
      startSec: i * slice,
      endSec: (i + 1) * slice,
    }));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (process.env.NODE_ENV === "development") {
      console.error("[transcribe]", msg);
    }
    throw new Error(
      `Transcription failed: ${msg}. If you use a project key, set OPENAI_PROJECT_ID in .env.local (OpenAI dashboard → project settings).`,
    );
  }
}

const ANALYSIS_SCHEMA_PROMPT = `You are a sales call QA analyst. Given a transcript (speaker-labeled agent/customer may be approximate), output strict JSON with:
{
  "summary": string (2-4 sentences),
  "sentiment": "positive" | "neutral" | "negative",
  "overallScore": number 0-10,
  "agentTalkPct": number 0-100,
  "customerTalkPct": number 0-100 (must sum ~100 with agent),
  "durationSec": number,
  "keywords": string[] (max 8 short topic labels),
  "actionItems": string[] (commitments / next steps),
  "positiveObservations": string[] (2-4),
  "negativeObservations": string[] (2-4),
  "questionnaire": { "topic": string, "asked": boolean }[],
  "agentScores": {
    "clarity": number 1-10,
    "politeness": number 1-10,
    "businessKnowledge": number 1-10,
    "problemHandling": number 1-10,
    "listening": number 1-10
  },
  "conversationQuality": string (2-4 sentences: pacing, structure, engagement, and whether the call felt balanced or rushed),
  "notablePatterns": string[] (0-4 short bullets: sentiment/tone shifts, objections, disengagement — use [] if none)
}
Questionnaire topics MUST be exactly this list in order: ${JSON.stringify([...DISCOVERY_TOPICS])}.
The user message is the full call transcript.
`;

async function analyzeOpenAI(
  segments: TranscriptSegment[],
  originalFilename: string,
): Promise<CallAnalysis> {
  const client = getClient();
  if (!client) {
    return analyzeFromTranscript(segments, originalFilename);
  }
  const transcript = segments
    .map((s) => `${s.speaker.toUpperCase()}: ${s.text}`)
    .join("\n");
  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ANALYSIS_SCHEMA_PROMPT },
        { role: "user", content: transcript },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return analyzeFromTranscript(segments, originalFilename);
    }
    try {
      const parsed = JSON.parse(raw) as CallAnalysis;
      let heuristicCache: CallAnalysis | undefined;
      const heuristic = () => {
        heuristicCache ??= analyzeFromTranscript(segments, originalFilename);
        return heuristicCache;
      };
      const cq =
        typeof parsed.conversationQuality === "string" && parsed.conversationQuality.trim()
          ? parsed.conversationQuality.trim()
          : heuristic().conversationQuality;
      const np = Array.isArray(parsed.notablePatterns)
        ? parsed.notablePatterns
        : heuristic().notablePatterns ?? [];
      return {
        ...parsed,
        questionnaire: DISCOVERY_TOPICS.map((topic, i) => ({
          topic,
          asked: Boolean(parsed.questionnaire?.[i]?.asked),
        })),
        conversationQuality: cq,
        notablePatterns: np,
      };
    } catch {
      return analyzeFromTranscript(segments, originalFilename);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (process.env.NODE_ENV === "development") {
      console.error("[analyze]", msg);
    }
    return analyzeFromTranscript(segments, originalFilename);
  }
}

export async function processUploadedAudio(params: {
  tempPath: string;
  originalFilename: string;
  /** If unknown, pass 0 and we estimate from file size. */
  durationSecHint: number;
}): Promise<CallRecord> {
  const { tempPath, originalFilename } = params;
  const st = await fs.stat(tempPath);
  const durationFromFile = await getAudioDurationSec(tempPath);
  let durationSecEstimate = params.durationSecHint;
  if (durationSecEstimate <= 0) {
    durationSecEstimate =
      durationFromFile ?? estimateDurationFromFileSizeBytes(st.size);
  }

  const segments = await transcribeOpenAI(tempPath, durationSecEstimate, originalFilename);
  const analysisFromAi = await analyzeOpenAI(segments, originalFilename);
  const lastSegEnd = segments.length ? segments[segments.length - 1]!.endSec : 0;
  const durationSec =
    durationFromFile ??
    (lastSegEnd >= 1 ? Math.round(lastSegEnd) : null) ??
    (analysisFromAi.durationSec > 0 ? Math.round(analysisFromAi.durationSec) : null) ??
    durationSecEstimate;

  const { agentTalkPct, customerTalkPct } = talkTimePctFromSegments(segments);

  const analysis: CallAnalysis = {
    ...analysisFromAi,
    durationSec,
    agentTalkPct,
    customerTalkPct,
  };

  const id = newId();
  const audioRelativePath = pathForStoredAudio(id, originalFilename);

  return {
    id,
    createdAt: new Date().toISOString(),
    originalFilename,
    audioRelativePath,
    transcript: segments,
    analysis,
  };
}
