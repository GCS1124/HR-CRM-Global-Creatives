import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
  eyebrow?: string;
  badge?: string;
  badgeIcon?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow = "Operations Hub",
  badge,
  badgeIcon,
}: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-[0.6rem] font-black uppercase tracking-[0.2em] text-brand-700 dark:text-brand-300">{eyebrow}</p> : null}
        <h1 className="text-2xl font-black leading-none tracking-tight text-slate-950 sm:text-3xl lg:text-4xl dark:text-slate-50">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-relaxed text-slate-500 dark:text-slate-300">{subtitle}</p>
        {badge ? (
          <div className="mt-3 flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-widest text-slate-700 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-100">
              {badgeIcon ? <span className="text-slate-400 dark:text-slate-300">{badgeIcon}</span> : null}
              {badge}
            </span>
          </div>
        ) : null}
      </div>
      {action ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{action}</div> : null}
    </header>
  );
}
