"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CallRecord, TranscriptSegment } from "@/lib/types";
import { formatDuration, sentimentLabel } from "@/lib/format";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-ink-muted">{label}</span>
        <span className="font-mono text-ink">{value.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/30">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.min(100, (value / 10) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function TranscriptPanel({
  segments,
  activeIndex,
  onSeek,
}: {
  segments: TranscriptSegment[];
  activeIndex: number;
  onSeek: (sec: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector(`[data-seg="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  return (
    <div
      ref={ref}
      className="max-h-[420px] space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-4"
    >
      {segments.map((seg, i) => (
        <button
          type="button"
          key={`${seg.startSec}-${i}`}
          data-seg={i}
          onClick={() => onSeek(seg.startSec)}
          className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
            i === activeIndex
              ? "border-accent/60 bg-accent/15 text-ink"
              : "border-transparent bg-white/5 text-ink-muted hover:border-white/10"
          }`}
        >
          <span
            className={
              seg.speaker === "agent"
                ? "font-medium text-accent"
                : "font-medium text-positive"
            }
          >
            {seg.speaker === "agent" ? "Agent" : "Customer"}
          </span>
          <span className="ml-2 text-ink/90">{seg.text}</span>
        </button>
      ))}
    </div>
  );
}

export default function CallDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [call, setCall] = useState<CallRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [t, setT] = useState(0);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Missing call id");
      return;
    }
    setLoading(true);
    setError(null);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/calls/${id}`);
        if (!res.ok) {
          if (!cancelled) {
            setError("Call not found");
            setCall(null);
            setLoading(false);
          }
          return;
        }
        const data = (await res.json()) as CallRecord;
        if (!cancelled) {
          setCall(data);
          setError(null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load call");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const segs = call?.transcript;
    if (!segs?.length) return;
    const idx = segs.findIndex((s) => t >= s.startSec && t < s.endSec);
    if (idx >= 0) setActiveIndex(idx);
  }, [t, call]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-negative">{error}</p>
        <Link href="/" className="mt-6 inline-block text-accent hover:underline">
          Back to dashboard
        </Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-ink-muted">Loading…</p>
      </main>
    );
  }

  if (!call) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-ink-muted">Not found.</p>
        <Link href="/" className="mt-4 inline-block text-accent hover:underline">
          Back to dashboard
        </Link>
      </main>
    );
  }

  const audioSrc = `/${call.audioRelativePath}`;
  const a = call.analysis;
  const discoveryCovered = a.questionnaire.filter((q) => q.asked).length;
  const discoveryTotal = a.questionnaire.length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="text-sm text-accent hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {call.originalFilename}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {new Date(call.createdAt).toLocaleString()} · {formatDuration(a.durationSec)}
          </p>
        </div>
        <div
          className={
            a.sentiment === "positive"
              ? "text-positive"
              : a.sentiment === "negative"
                ? "text-negative"
                : "text-caution"
          }
        >
          <p className="text-sm text-ink-muted">Call sentiment</p>
          <p className="text-xl font-semibold">{sentimentLabel(a.sentiment)}</p>
          <p className="mt-1 font-mono text-2xl text-ink">{a.overallScore.toFixed(1)} / 10</p>
        </div>
      </div>

      <section className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Recording & transcript
          </h2>
          <audio
            ref={audioRef}
            controls
            className="mt-3 w-full"
            src={audioSrc}
            onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
          />
          <div className="mt-4">
            <TranscriptPanel
              segments={call.transcript}
              activeIndex={activeIndex}
              onSeek={(sec) => {
                const el = audioRef.current;
                if (el) {
                  el.currentTime = sec;
                  void el.play();
                }
              }}
            />
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-2xl border border-white/10 bg-surface-muted/60 p-6">
            <h2 className="text-sm font-semibold text-ink-muted">Summary</h2>
            <p className="mt-3 text-ink/95 leading-relaxed">{a.summary}</p>
            <p className="mt-3 text-sm text-accent/90">
              Discovery coverage:{" "}
              <span className="font-semibold text-ink">
                {discoveryCovered} of {discoveryTotal}
              </span>{" "}
              predefined topics detected in the transcript.
            </p>
          </div>

          {a.conversationQuality ? (
            <div className="rounded-2xl border border-white/10 bg-surface-muted/60 p-6">
              <h2 className="text-sm font-semibold text-ink-muted">Conversation quality</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink/95">
                {a.conversationQuality}
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                Pacing, structure, and engagement (per hackathon brief).
              </p>
            </div>
          ) : null}

          {a.notablePatterns && a.notablePatterns.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-surface-muted/60 p-6">
              <h2 className="text-sm font-semibold text-ink-muted">Patterns & shifts</h2>
              <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-ink/95">
                {a.notablePatterns.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-surface-muted/60 p-6">
            <h2 className="text-sm font-semibold text-ink-muted">Talk time</h2>
            <div className="mt-4 flex gap-6">
              <div>
                <p className="text-xs text-ink-muted">Agent</p>
                <p className="text-2xl font-mono text-accent">{a.agentTalkPct}%</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Customer</p>
                <p className="text-2xl font-mono text-positive">{a.customerTalkPct}%</p>
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full bg-gradient-to-r from-accent to-positive"
                style={{
                  width: "100%",
                  background: `linear-gradient(90deg, rgb(99 102 241) 0%, rgb(99 102 241) ${a.agentTalkPct}%, rgb(52 211 153) ${a.agentTalkPct}%, rgb(52 211 153) 100%)`,
                }}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              Share of time per transcript segment (Whisper does not diarize speakers; labels are
              approximate). Percentages are computed from segment start/end times, not from the model
              text alone.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-surface-muted/60 p-6">
            <h2 className="text-sm font-semibold text-ink-muted">Agent performance (1–10)</h2>
            <div className="mt-4 space-y-4">
              <ScoreBar label="Communication clarity" value={a.agentScores.clarity} />
              <ScoreBar label="Politeness" value={a.agentScores.politeness} />
              <ScoreBar label="Business knowledge" value={a.agentScores.businessKnowledge} />
              <ScoreBar label="Problem handling" value={a.agentScores.problemHandling} />
              <ScoreBar label="Listening ability" value={a.agentScores.listening} />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-surface-muted/60 p-6">
          <h2 className="text-sm font-semibold text-ink-muted">Discovery coverage</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/20 text-ink-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Topic</th>
                  <th className="px-3 py-2 font-medium">Asked?</th>
                </tr>
              </thead>
              <tbody>
                {a.questionnaire.map((row) => (
                  <tr key={row.topic} className="border-t border-white/5">
                    <td className="px-3 py-2 text-ink/90">{row.topic}</td>
                    <td className="px-3 py-2">
                      {row.asked ? (
                        <span className="text-positive">Yes</span>
                      ) : (
                        <span className="text-ink-muted">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-muted/60 p-6">
          <h2 className="text-sm font-semibold text-ink-muted">Top keywords</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {a.keywords.map((k) => (
              <span
                key={k}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-ink"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-surface-muted/60 p-6">
          <h2 className="text-sm font-semibold text-ink-muted">Follow-up action items</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-ink/95">
            {a.actionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-surface-muted/60 p-6">
            <h2 className="text-sm font-semibold text-positive">Positive observations</h2>
            <ul className="mt-4 space-y-2 text-sm text-ink/95">
              {a.positiveObservations.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-positive">+</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface-muted/60 p-6">
            <h2 className="text-sm font-semibold text-negative">Negative observations</h2>
            <ul className="mt-4 space-y-2 text-sm text-ink/95">
              {a.negativeObservations.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-negative">−</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
