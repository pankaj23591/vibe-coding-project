"use client";

import { useEffect, useState } from "react";
import type { CallRecord } from "@/lib/types";
import type { DashboardStats } from "@/lib/aggregate";
import { StatCard } from "@/components/StatCard";
import { UploadDropzone } from "@/components/UploadDropzone";
import { CallsTable } from "@/components/CallsTable";
import { formatDuration } from "@/lib/format";
import { DashboardKeywordTable } from "@/components/DashboardKeywordTable";
import { DashboardSection } from "@/components/DashboardSection";

function pct(part: number, total: number): string {
  if (total <= 0) return "0";
  return ((part / total) * 100).toFixed(0);
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoadError(null);
    setRefreshing(true);
    try {
      const res = await fetch("/api/calls");
      const data = (await res.json()) as {
        stats?: DashboardStats;
        calls?: CallRecord[];
      };
      setStats(data.stats ?? null);
      setCalls(data.calls ?? []);
    } catch {
      setLoadError("Could not load dashboard");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const s = stats;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-surface-muted/30 px-6 py-8 sm:px-10 sm:py-10">
        <div className="absolute -right-24 top-0 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent/90">
              Call Intelligence
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Team performance
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
              One place for transcripts, quality scores, sentiment, discovery coverage, and follow-up
              actions across your call library.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-ink transition hover:border-white/15 hover:bg-white/[0.07] disabled:opacity-50"
          >
            {refreshing ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                Refreshing
              </>
            ) : (
              "Refresh"
            )}
          </button>
        </div>
      </header>

      <section className="mt-8">
        <UploadDropzone />
      </section>

      {loadError ? (
        <p className="mt-8 rounded-xl border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
          {loadError}
        </p>
      ) : !s ? (
        <div className="mt-12 flex items-center justify-center gap-3 text-ink-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
          Loading dashboard…
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-10">
          <DashboardSection title="Overview metrics" description="Rollups across every processed call.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Total calls processed" value={String(s.totalCalls)} />
              <StatCard
                label="Sentiment split"
                value={
                  s.totalCalls === 0
                    ? "—"
                    : `${s.sentimentSplit.positive}+ / ${s.sentimentSplit.neutral}~ / ${s.sentimentSplit.negative}−`
                }
                hint={
                  s.totalCalls === 0
                    ? "Positive / neutral / negative"
                    : `${pct(s.sentimentSplit.positive, s.totalCalls)}% pos · ${pct(s.sentimentSplit.neutral, s.totalCalls)}% neu · ${pct(s.sentimentSplit.negative, s.totalCalls)}% neg`
                }
              />
              <StatCard
                label="Average call score"
                value={s.totalCalls === 0 ? "—" : `${s.averageScore.toFixed(1)} / 10`}
              />
              <StatCard
                label="Avg. call duration"
                value={s.totalCalls === 0 ? "—" : formatDuration(s.avgDurationSec)}
              />
              <StatCard
                label="Action items (total)"
                value={String(s.actionItemsTotal)}
                hint="Commitments detected across all calls"
              />
              <StatCard
                label="Top keywords (preview)"
                value={
                  s.topKeywords.length
                    ? s.topKeywords
                        .slice(0, 3)
                        .map((k) => k.word)
                        .join(", ")
                    : "—"
                }
                hint={
                  s.topKeywords.length > 3
                    ? `+${s.topKeywords.length - 3} more below`
                    : undefined
                }
              />
            </div>
          </DashboardSection>

          <DashboardSection
            title="Topic frequency"
            description="How often each keyword appears across your analyzed calls."
          >
            <DashboardKeywordTable stats={s} />
          </DashboardSection>

          <DashboardSection
            title="Recording library"
            description="Chronological list of uploaded audio files with analysis results."
          >
            <CallsTable calls={calls} onDeleted={() => void load()} />
          </DashboardSection>
        </div>
      )}
    </main>
  );
}
