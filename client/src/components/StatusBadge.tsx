import clsx from "clsx";

interface StatusBadgeProps {
  value: string;
}

const toneMap: Record<string, string> = {
  active:
    "border-white/60 bg-white/90 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.12)] dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  on_leave: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/12 dark:text-amber-200",
  inactive: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-200",
  present: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/12 dark:text-emerald-200",
  late: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/30 dark:bg-orange-400/12 dark:text-orange-200",
  remote: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/12 dark:text-sky-200",
  absent: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/12 dark:text-rose-200",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/12 dark:text-emerald-200",
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/12 dark:text-amber-200",
  rejected: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/12 dark:text-rose-200",
  sourced: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/12 dark:text-indigo-200",
  interview: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/12 dark:text-sky-200",
  offer: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/12 dark:text-violet-200",
  hired: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/12 dark:text-emerald-200",
  processed: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/12 dark:text-emerald-200",
  scheduled: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/12 dark:text-blue-200",
  todo: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-200",
  in_progress: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/12 dark:text-amber-200",
  blocked: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/12 dark:text-rose-200",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/12 dark:text-emerald-200",
  low: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-200",
  medium: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/12 dark:text-sky-200",
  high: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/12 dark:text-amber-200",
  critical: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/12 dark:text-rose-200",
};

const dotMap: Record<string, string> = {
  active: "bg-emerald-500",
  on_leave: "bg-amber-500",
  inactive: "bg-slate-500",
  present: "bg-emerald-500",
  late: "bg-orange-500",
  remote: "bg-sky-500",
  absent: "bg-rose-500",
  approved: "bg-emerald-500",
  pending: "bg-amber-500",
  rejected: "bg-rose-500",
  sourced: "bg-indigo-500",
  interview: "bg-sky-500",
  offer: "bg-violet-500",
  hired: "bg-emerald-500",
  processed: "bg-emerald-500",
  scheduled: "bg-blue-500",
  todo: "bg-slate-500",
  in_progress: "bg-amber-500",
  blocked: "bg-rose-500",
  done: "bg-emerald-500",
  low: "bg-slate-500",
  medium: "bg-sky-500",
  high: "bg-amber-500",
  critical: "bg-rose-500",
};

function toLabel(value: string): string {
  if (value === "processed") {
    return "Completed";
  }
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const highlight = value === "active";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide",
        toneMap[value] ?? "border-slate-200 bg-slate-100 text-slate-700",
        highlight &&
          "bg-white/85 text-brand-900 border-brand-200/80 ring-1 ring-brand-200/80 shadow-sm dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20",
      )}
    >
      <span
        className={clsx(
          "h-2 w-2 rounded-full",
          dotMap[value] ?? "bg-slate-500",
          highlight && "h-2.5 w-2.5 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]",
        )}
      />
      {toLabel(value)}
    </span>
  );
}
