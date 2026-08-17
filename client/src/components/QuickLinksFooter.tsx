import { Link, useLocation } from "react-router-dom";
import type { NavItem } from "../types/navigation";

interface QuickLinksFooterProps {
  items: NavItem[];
  title?: string;
}

const toneByLabel: Record<string, { tone: string; iconTone: string }> = {
  attendance: {
    tone: "border-sky-200 bg-sky-50/60 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200",
    iconTone: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200",
  },
  leave: {
    tone: "border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200",
    iconTone: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
  },
  payroll: {
    tone: "border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200",
    iconTone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200",
  },
  profile: {
    tone: "border-slate-200 bg-slate-50/60 text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200",
    iconTone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  employees: {
    tone: "border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200",
    iconTone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200",
  },
  recruitment: {
    tone: "border-violet-200 bg-violet-50/60 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200",
    iconTone: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200",
  },
  tasks: {
    tone: "border-indigo-200 bg-indigo-50/60 text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200",
    iconTone: "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200",
  },
  settings: {
    tone: "border-slate-200 bg-slate-50/60 text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200",
    iconTone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
};

const resolveTone = (label: string) => {
  const key = label.trim().toLowerCase();
  return toneByLabel[key] ?? {
    tone: "border-brand-200 bg-brand-50/60 text-brand-700 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-200",
    iconTone: "bg-brand-100 text-brand-700 dark:bg-brand-400/15 dark:text-brand-200",
  };
};

const defaultTitle = "Quick links";
export function QuickLinksFooter({ items, title = defaultTitle }: QuickLinksFooterProps) {
  const location = useLocation();
  const footerItems = items.filter((item) => item.footerOnly);
  const quickItems = footerItems.length > 0 ? footerItems : items;
  if (quickItems.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-slate-700/60 dark:bg-slate-950/80">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickItems.map((card) => {
          const tone = resolveTone(card.label);
          const isActive = location.pathname === card.path || location.pathname.startsWith(`${card.path}/`);

          return (
            <Link
              key={card.path}
              to={card.path}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition hover:brightness-95 ${tone.tone} ${
              isActive ? "ring-2 ring-brand-200" : ""
            }`}
          >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone.iconTone}`}>
                <card.icon className="h-4 w-4" />
              </span>
              {card.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
