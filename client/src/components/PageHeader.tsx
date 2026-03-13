import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
  eyebrow?: string;
}

export function PageHeader({ title, subtitle, action, eyebrow = "Operations Hub" }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-950 md:text-[2.45rem]">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-600 md:text-[0.96rem]">{subtitle}</p>
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </header>
  );
}
