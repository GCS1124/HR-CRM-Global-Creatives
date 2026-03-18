import type { LucideIcon } from "lucide-react";

interface ModuleHeroProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  chips: string[];
  spotlight?: string;
}

export function ModuleHero({ icon: Icon, title, subtitle, chips, spotlight }: ModuleHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand-200/70 bg-white p-5 shadow-soft">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.12),transparent_42%)]" />
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="h-4 w-4" />
        </span>
        <div className="relative">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>
      {chips.length > 0 ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
          {chips.join(" · ")}
        </p>
      ) : null}
      {spotlight ? <p className="mt-2 text-xs font-semibold text-[#ea580c]">{spotlight}</p> : null}
    </section>
  );
}
