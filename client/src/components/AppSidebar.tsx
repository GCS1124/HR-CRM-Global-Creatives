import clsx from "clsx";
import { NavLink } from "react-router-dom";
import type { NavItem } from "../types/navigation";
import { BrandLogo } from "./BrandLogo";

interface AppSidebarProps {
  items: NavItem[];
  workspaceLabel: string;
}

export function AppSidebar({ items, workspaceLabel }: AppSidebarProps) {
  const navItems = items.filter((item) => !item.footerOnly);
  return (
    <aside className="relative hidden w-[248px] shrink-0 overflow-hidden border-r border-brand-200/60 bg-[linear-gradient(180deg,rgba(0,86,143,0.98)_0%,rgba(0,149,255,0.97)_38%,rgba(214,241,255,0.96)_100%)] shadow-[18px_0_60px_rgba(0,149,255,0.16)] lg:flex lg:flex-col">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.26),transparent_34%)]" />

      <div className="relative border-b border-white/18 px-5 py-5">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/18 bg-white/10 px-4 py-3 shadow-[0_18px_45px_rgba(0,86,143,0.16)] backdrop-blur-sm">
            <BrandLogo size="md" variant="plain" />
          </div>
          <div className="px-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/78">Workspace</p>
            <p className="text-lg font-bold text-white/78">{workspaceLabel}</p>
          </div>
        </div>
      </div>

      <div className="relative px-4 py-4">
        <nav className="mt-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                  isActive
                    ? "bg-white text-brand-950 shadow-[0_18px_36px_rgba(0,86,143,0.18)]"
                    : "text-white/95 hover:bg-white/14 hover:text-white",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={clsx(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition",
                      isActive
                        ? "bg-brand-100 text-brand-950"
                        : "bg-white/12 text-white group-hover:bg-white/22 group-hover:text-white",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className={clsx("truncate", isActive ? "!text-brand-950" : "!text-white")}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
