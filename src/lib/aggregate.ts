import type { CallRecord, SentimentLabel } from "./types";

export type DashboardStats = {
  totalCalls: number;
  sentimentSplit: Record<SentimentLabel, number>;
  averageScore: number;
  avgDurationSec: number;
  topKeywords: { word: string; count: number }[];
  actionItemsTotal: number;
};

export function buildDashboardStats(calls: CallRecord[]): DashboardStats {
  if (calls.length === 0) {
    return {
      totalCalls: 0,
      sentimentSplit: { positive: 0, neutral: 0, negative: 0 },
      averageScore: 0,
      avgDurationSec: 0,
      topKeywords: [],
      actionItemsTotal: 0,
    };
  }
  const sentimentSplit: Record<SentimentLabel, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };
  let scoreSum = 0;
  let durSum = 0;
  let actionItemsTotal = 0;
  const kwCount = new Map<string, number>();

  for (const c of calls) {
    sentimentSplit[c.analysis.sentiment] += 1;
    scoreSum += c.analysis.overallScore;
    durSum += c.analysis.durationSec;
    actionItemsTotal += c.analysis.actionItems.length;
    for (const k of c.analysis.keywords) {
      kwCount.set(k, (kwCount.get(k) ?? 0) + 1);
    }
  }

  const topKeywords = Array.from(kwCount.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    totalCalls: calls.length,
    sentimentSplit,
    averageScore: Math.round((scoreSum / calls.length) * 10) / 10,
    avgDurationSec: Math.round(durSum / calls.length),
    topKeywords,
    actionItemsTotal,
  };
}
