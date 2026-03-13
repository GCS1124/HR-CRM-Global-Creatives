import clsx from "clsx";

interface StatusBadgeProps {
  value: string;
}

const toneMap: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  on_leave: "border-amber-200 bg-amber-50 text-amber-700",
  inactive: "border-slate-200 bg-slate-100 text-slate-700",
  present: "border-emerald-200 bg-emerald-50 text-emerald-700",
  late: "border-orange-200 bg-orange-50 text-orange-700",
  remote: "border-sky-200 bg-sky-50 text-sky-700",
  absent: "border-rose-200 bg-rose-50 text-rose-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  sourced: "border-indigo-200 bg-indigo-50 text-indigo-700",
  interview: "border-sky-200 bg-sky-50 text-sky-700",
  offer: "border-violet-200 bg-violet-50 text-violet-700",
  hired: "border-emerald-200 bg-emerald-50 text-emerald-700",
  processed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  scheduled: "border-blue-200 bg-blue-50 text-blue-700",
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
};

function toLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function StatusBadge({ value }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide",
        toneMap[value] ?? "border-slate-200 bg-slate-100 text-slate-700",
      )}
    >
      <span className={clsx("h-2 w-2 rounded-full", dotMap[value] ?? "bg-slate-500")} />
      {toLabel(value)}
    </span>
  );
}
