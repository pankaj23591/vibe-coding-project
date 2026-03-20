import type { ReactNode } from "react";

export function DashboardSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-surface-muted/25 shadow-lg shadow-black/20 backdrop-blur-sm">
      <div className="flex flex-col gap-1 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-ink-muted/90">{description}</p>
          ) : null}
        </div>
        {action ? <div className="mt-2 shrink-0 sm:mt-0">{action}</div> : null}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}
