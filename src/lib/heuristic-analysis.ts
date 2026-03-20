import { DISCOVERY_TOPICS } from "./questionnaire";
import { talkTimePctFromSegments } from "./talk-time";
import type { CallAnalysis, SentimentLabel, TranscriptSegment } from "./types";

const KEYWORD_HINTS: { word: string; keyword: string }[] = [
  { word: "budget", keyword: "Budget" },
  { word: "quote", keyword: "Pricing & Quote" },
  { word: "cabinet", keyword: "Cabinet Style" },
  { word: "installation", keyword: "Installation" },
  { word: "warranty", keyword: "Warranty" },
  { word: "timeline", keyword: "Delivery Timeline" },
  { word: "competitor", keyword: "Competitor Comparison" },
  { word: "design", keyword: "Design Options" },
  { word: "remodel", keyword: "Remodel Scope" },
  { word: "kitchen", keyword: "Kitchen Scope" },
];

const QUESTION_TRIGGERS: Partial<Record<string, string[]>> = {
  "Budget Discussion": ["budget", "cost", "price", "quote"],
  "Competitor Comparison": ["competitor", "other quote", "comparison"],
  "Kitchen Size / Scope": ["scope", "size", "space", "layout"],
  "Cabinet Style Preference": ["cabinet", "style", "finish"],
  "Remodeling Full Kitchen?": ["full kitchen", "remodel", "renovation"],
  "Timeline & Milestones": ["timeline", "schedule", "when", "delivery", "installation"],
  "Decision Makers": ["partner", "decision", "stakeholder", "approve"],
};

function fullText(segments: TranscriptSegment[]): string {
  return segments.map((s) => s.text).join(" ").toLowerCase();
}

function clampScore(n: number): number {
  return Math.min(10, Math.max(1, Math.round(n * 10) / 10));
}

export function analyzeFromTranscript(
  segments: TranscriptSegment[],
  originalFilename: string,
): CallAnalysis {
  const text = fullText(segments);
  const { agentTalkPct: agent, customerTalkPct: customer } = talkTimePctFromSegments(segments);
  const durationSec = segments.length
    ? Math.max(60, Math.round(segments[segments.length - 1]!.endSec))
    : 120;

  const keywords = new Set<string>();
  for (const { word, keyword } of KEYWORD_HINTS) {
    if (text.includes(word)) keywords.add(keyword);
  }
  if (keywords.size === 0) {
    ["Discovery", "Follow-up", "Next Steps"].forEach((k) => keywords.add(k));
  }

  const questionnaire = DISCOVERY_TOPICS.map((topic) => {
    const triggers = QUESTION_TRIGGERS[topic] ?? [topic.split(" ")[0]!.toLowerCase()];
    const asked = triggers.some((t) => text.includes(t));
    return { topic, asked };
  });

  const covered = questionnaire.filter((q) => q.asked).length;
  const listeningPenalty = agent > 72 ? 1.4 : 0;
  const discoveryBoost = covered >= 4 ? 0.6 : -0.8;

  const base = 6.8 + discoveryBoost - listeningPenalty + (customer > 35 ? 0.4 : -0.3);
  const clarity = clampScore(base + 0.2);
  const politeness = clampScore(base + 0.5);
  const businessKnowledge = clampScore(base + (text.includes("warranty") ? 0.4 : -0.2));
  const problemHandling = clampScore(base + (text.includes("worried") || text.includes("unclear") ? 0.3 : 0));
  const listening = clampScore(base + (agent < 65 ? 0.9 : -0.6));

  let sentiment: SentimentLabel = "neutral";
  if (text.includes("worried") || text.includes("frustrat") || text.includes("unclear")) {
    sentiment = text.includes("thanks") || text.includes("great") ? "neutral" : "negative";
  }
  if (text.includes("great") && text.includes("thanks") && !text.includes("defensive")) {
    sentiment = "positive";
  }

  const overallScore = clampScore(
    (clarity + politeness + businessKnowledge + problemHandling + listening) / 5,
  );

  const summary = `Sales discovery call regarding ${originalFilename.replace(/\.[^.]+$/, "")}. Discussion covered ${Array.from(keywords).slice(0, 3).join(", ") || "general scope"} with ${covered}/${questionnaire.length} discovery themes addressed. Outcome: align on quote, materials, and next meeting.`;

  const actionItems = [
    "Send updated quote to customer",
    "Share design options and catalog",
    "Schedule design consultation",
  ].filter((_, i) => i < 2 + (covered % 2));

  const positiveObservations = [
    "Agent stayed structured and clarified next steps",
    "Product and warranty topics addressed when customer raised concerns",
  ];
  const negativeObservations: string[] = [];
  if (covered < 4) {
    negativeObservations.push("Several discovery themes were light or missing from the conversation");
  }
  if (agent > 70) {
    negativeObservations.push("Agent talk time is high — ensure more space for customer expansion");
  }
  if (negativeObservations.length === 0) {
    negativeObservations.push("Pricing depth could be expanded to reduce follow-up friction");
  }

  const notablePatterns: string[] = [];
  if (text.includes("worried") || text.includes("frustrat")) {
    notablePatterns.push("Customer expressed concern or frustration at least once");
  }
  if (text.includes("competitor") || text.includes("other quote")) {
    notablePatterns.push("Competitive context surfaced during the discussion");
  }
  if (agent > 68 && customer < 32) {
    notablePatterns.push("Late-call risk: customer share of airtime stayed low");
  }

  const conversationQuality = [
    `Pacing follows a ${segments.length > 6 ? "multi-turn" : "short"} exchange with ${segments.length} labeled segments.`,
    `Structure ${covered >= 4 ? "covers most discovery themes" : "leaves discovery gaps"} (${covered}/${questionnaire.length} topics).`,
    `Engagement: ${customer < 30 ? "customer speaking time is low — conversation skews agent-led" : customer > 45 ? "customer had meaningful space to speak" : "talk time is moderately balanced"}.`,
    `${agent > 72 ? "Consider coaching on pause-and-listen to improve flow." : "Flow reads workable for a discovery-style call."}`,
  ].join(" ");

  return {
    summary,
    sentiment,
    overallScore,
    agentTalkPct: agent,
    customerTalkPct: customer,
    durationSec,
    keywords: Array.from(keywords).slice(0, 8),
    actionItems,
    positiveObservations,
    negativeObservations,
    questionnaire,
    agentScores: {
      clarity,
      politeness,
      businessKnowledge,
      problemHandling,
      listening,
    },
    conversationQuality,
    notablePatterns,
  };
}
