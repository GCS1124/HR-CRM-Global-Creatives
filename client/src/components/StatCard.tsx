import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  trend?: string;
  accent?: boolean;
}

export function StatCard({ title, value, hint, icon: Icon, trend, accent = false }: StatCardProps) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
      {accent ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1a2a69,#3b82f6,#f97316)]" />
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
        </div>
        <span className="rounded-lg bg-brand-50 p-2 text-brand-600">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {hint ? <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p> : null}
      {trend ? <p className="mt-1 text-xs font-semibold text-emerald-700">{trend}</p> : null}
    </article>
  );
}
