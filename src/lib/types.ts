export type SentimentLabel = "positive" | "neutral" | "negative";

export type TranscriptSegment = {
  speaker: "agent" | "customer";
  text: string;
  startSec: number;
  endSec: number;
};

export type QuestionnaireRow = {
  topic: string;
  asked: boolean;
};

export type AgentDimensionScore = {
  clarity: number;
  politeness: number;
  businessKnowledge: number;
  problemHandling: number;
  listening: number;
};

export type CallAnalysis = {
  summary: string;
  sentiment: SentimentLabel;
  overallScore: number;
  agentTalkPct: number;
  customerTalkPct: number;
  durationSec: number;
  keywords: string[];
  actionItems: string[];
  positiveObservations: string[];
  negativeObservations: string[];
  questionnaire: QuestionnaireRow[];
  agentScores: AgentDimensionScore;
  /** Pacing, structure, engagement, flow (hackathon: conversation quality). */
  conversationQuality?: string;
  /** Tone shifts, objections, engagement changes (hackathon: patterns). */
  notablePatterns?: string[];
};

export type CallRecord = {
  id: string;
  createdAt: string;
  originalFilename: string;
  audioRelativePath: string;
  transcript: TranscriptSegment[];
  analysis: CallAnalysis;
};

export type CallSummaryRow = Pick<
  CallRecord,
  "id" | "createdAt" | "originalFilename" | "analysis"
>;
