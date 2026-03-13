import type { LucideIcon } from "lucide-react";

interface ModuleHeroProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  chips: string[];
  spotlight?: string;
}

export function ModuleHero({ title, subtitle, chips, spotlight }: ModuleHeroProps) {
  return (
    <section className="surface-card p-5 md:p-6">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 md:text-base">{subtitle}</p>
          {chips.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span key={chip} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {spotlight ? (
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 md:min-w-[180px] md:text-right">
            <p className="text-[0.64rem] font-black uppercase tracking-[0.14em] text-slate-500">Spotlight</p>
            <p className="mt-1 font-semibold text-slate-900">{spotlight}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
