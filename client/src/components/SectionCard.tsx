import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, type ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
  showAccent?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  children,
  rightSlot,
  showAccent = true,
  collapsible = false,
  collapsed,
  defaultCollapsed = false,
}: SectionCardProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isCollapsed = collapsed ?? internalCollapsed;
  const canToggle = collapsible && collapsed === undefined;

  return (
    <section className="surface-card relative overflow-hidden transition-all duration-200 hover:shadow-md dark:border-slate-700/60">
      {showAccent ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-brand-600" />
      ) : null}
      {title ? (
        <header className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between dark:border-slate-700/60">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black leading-tight tracking-tight text-slate-900 sm:truncate dark:text-slate-50">{title}</h2>
            {subtitle ? <p className="mt-1 max-w-xl text-xs font-bold leading-relaxed text-slate-400 dark:text-slate-300">{subtitle}</p> : null}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
            {rightSlot ? <div>{rightSlot}</div> : null}
            {canToggle ? (
              <button
                type="button"
                onClick={() => setInternalCollapsed((current) => !current)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                {isCollapsed ? "Expand" : "Collapse"}
              </button>
            ) : null}
          </div>
        </header>
      ) : null}
      {isCollapsed ? null : <div className="relative">{children}</div>}
    </section>
  );
}
