import type { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
}

export function SectionCard({ title, subtitle, children, rightSlot }: SectionCardProps) {
  return (
    <section className="surface-card overflow-hidden p-5 md:p-6">
      {title ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">{subtitle}</p> : null}
          </div>
          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </header>
      ) : null}
      <div>{children}</div>
    </section>
  );
}
