import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  trend?: string;
}

export function StatCard({ title, value, hint, icon: Icon, trend }: StatCardProps) {
  return (
    <article className="surface-card relative overflow-hidden p-4 md:p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-brand-700" />
      <div className="flex items-start justify-between gap-3 pt-1">
        <div>
          <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className="rounded-lg bg-slate-50 p-2.5 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {(hint || trend) ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {hint ? <p className="text-sm font-medium text-slate-600">{hint}</p> : null}
          {trend ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-[0.68rem] font-bold text-emerald-700">{trend}</span> : null}
        </div>
      ) : null}
    </article>
  );
}
