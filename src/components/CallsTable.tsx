"use client";

import Link from "next/link";
import { useState } from "react";
import type { CallRecord } from "@/lib/types";
import { formatDuration, sentimentLabel } from "@/lib/format";

function sentimentStyles(s: CallRecord["analysis"]["sentiment"]) {
  if (s === "positive") {
    return "border-positive/25 bg-positive/10 text-positive";
  }
  if (s === "negative") {
    return "border-negative/25 bg-negative/10 text-negative";
  }
  return "border-caution/25 bg-caution/10 text-caution";
}

export function CallsTable({
  calls,
  onDeleted,
}: {
  calls: CallRecord[];
  onDeleted?: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (c: CallRecord) => {
    if (!confirm(`Delete “${c.originalFilename}” from the library? This cannot be undone.`)) {
      return;
    }
    setError(null);
    setDeletingId(c.id);
    try {
      const res = await fetch(`/api/calls/${encodeURIComponent(c.id)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `Delete failed (${res.status})`);
      }
      onDeleted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/10 py-14 text-center">
        <p className="text-sm font-medium text-ink-muted">No recordings yet</p>
        <p className="mt-1 max-w-sm text-xs text-ink-muted/80">
          Upload an audio file above to see it listed here with transcript and insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-negative" role="alert">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-black/25">
              <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Recording
              </th>
              <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Processed
              </th>
              <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Length
              </th>
              <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Sentiment
              </th>
              <th className="whitespace-nowrap px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Score
              </th>
              <th className="whitespace-nowrap px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {calls.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-white/[0.03]">
                <td className="max-w-[220px] px-4 py-3.5">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[10px] font-bold uppercase text-ink-muted">
                      {c.originalFilename.split(".").pop() ?? "—"}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/calls/${c.id}`}
                        className="truncate font-medium text-ink hover:text-accent"
                        title={c.originalFilename}
                      >
                        {c.originalFilename}
                      </Link>
                      <p className="truncate font-mono text-[11px] text-ink-muted/70">{c.id}</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-ink-muted">
                  {new Date(c.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs tabular-nums text-ink-muted">
                  {formatDuration(c.analysis.durationSec)}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${sentimentStyles(c.analysis.sentiment)}`}
                  >
                    {sentimentLabel(c.analysis.sentiment)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-right">
                  <span className="inline-flex min-w-[2.75rem] justify-end rounded-lg bg-white/5 px-2 py-1 font-mono text-sm font-semibold tabular-nums text-ink">
                    {c.analysis.overallScore.toFixed(1)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/calls/${c.id}`}
                      className="text-xs font-semibold text-accent hover:text-accent/80"
                    >
                      View →
                    </Link>
                    <button
                      type="button"
                      disabled={deletingId === c.id}
                      onClick={() => void handleDelete(c)}
                      className="text-xs font-semibold text-negative/90 hover:text-negative disabled:opacity-40"
                    >
                      {deletingId === c.id ? "…" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
