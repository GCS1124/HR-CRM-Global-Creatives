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
    <article className="relative overflow-hidden rounded-xl border border-slate-200/60 bg-white p-3 shadow-soft transition-all hover:shadow-md active:scale-[0.98] dark:border-slate-700/60 dark:bg-slate-900/80 sm:p-4">
      {accent ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-brand-600" />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.65rem] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300">{title}</p>
          <p className="mt-1 break-words text-xl font-black leading-tight tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">{value}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      {hint || trend ? (
        <div className="mt-3 flex items-start justify-between gap-2 border-t border-slate-50 pt-2 dark:border-slate-700/60 sm:items-center">
          {hint ? <p className="text-[0.68rem] font-bold leading-snug text-slate-500 dark:text-slate-300">{hint}</p> : <div />}
          {trend ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[0.6rem] font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
              {trend}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
