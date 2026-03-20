export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-surface-muted/50 p-5 shadow-md shadow-black/15 transition hover:border-white/10 hover:bg-surface-muted/70">
      <div className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-accent/80 to-accent/20 opacity-80" />
      <p className="pl-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className="mt-3 pl-2 font-mono text-2xl font-semibold tabular-nums tracking-tight text-ink sm:text-3xl">
        {value}
      </p>
      {hint ? <p className="mt-2 pl-2 text-xs leading-snug text-ink-muted/85">{hint}</p> : null}
    </div>
  );
}
