import type { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
  showAccent?: boolean;
}

export function SectionCard({ title, subtitle, children, rightSlot, showAccent = true }: SectionCardProps) {
  return (
    <section className="surface-card relative overflow-hidden p-5 md:p-6">
      {showAccent ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ffffff,#0095ff,#ffffff)]" />
      ) : null}
      {title ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/70 pb-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm font-medium leading-relaxed text-slate-700">{subtitle}</p> : null}
          </div>
          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </header>
      ) : null}
      <div>{children}</div>
    </section>
  );
}
