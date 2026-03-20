import type { DashboardStats } from "@/lib/aggregate";

export function DashboardKeywordTable({ stats }: { stats: DashboardStats }) {
  if (stats.totalCalls === 0 || stats.topKeywords.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-black/10 py-10 text-center text-sm text-ink-muted">
        Upload and process calls to see topic frequency here.
      </div>
    );
  }

  const max = Math.max(...stats.topKeywords.map((k) => k.count), 1);

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06]">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] bg-black/25">
            <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Topic / keyword
            </th>
            <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Calls
            </th>
            <th className="hidden w-[40%] min-w-[140px] sm:table-cell sm:px-4 sm:py-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Share
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {stats.topKeywords.map((row) => (
            <tr key={row.word} className="hover:bg-white/[0.02]">
              <td className="px-4 py-3 font-medium text-ink/95">{row.word}</td>
              <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-ink-muted">
                {row.count}
              </td>
              <td className="hidden px-4 py-2.5 sm:table-cell">
                <div className="h-2 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full bg-accent/70"
                    style={{ width: `${Math.max(8, (row.count / max) * 100)}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
