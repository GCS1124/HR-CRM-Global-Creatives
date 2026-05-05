import clsx from "clsx";
import { NavLink } from "react-router-dom";
import type { NavItem } from "../types/navigation";
import { BrandLogo } from "./BrandLogo";
import { groupItems } from "../utils/navigationGroups";

interface AppSidebarProps {
  items: NavItem[];
  workspaceLabel: string;
}

export function AppSidebar({ items, workspaceLabel }: AppSidebarProps) {
  const navItems = items.filter((item) => !item.footerOnly);
  const sections = groupItems(navItems);
  return (
    <aside className="app-sidebar relative hidden w-[240px] xl:w-[260px] shrink-0 overflow-hidden border-r lg:flex lg:flex-col">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.26),transparent_34%)]" />

      <div className="relative border-b border-white/10 px-5 py-4 short:py-3">
        <div className="space-y-4 short:space-y-2">
          <div className="sidebar-brand-pill rounded-2xl border px-4 py-2.5 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
            <BrandLogo size="md" variant="plain" />
          </div>
          <div className="px-1">
            <p className="text-base xl:text-lg font-black text-white leading-tight">{workspaceLabel}</p>
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
        <nav className="space-y-5">
          {sections.map((section) => (
            <div key={section.group ?? "default"} className="space-y-2">
              {section.group ? (
                <p className="px-2 text-[0.62rem] font-black uppercase tracking-[0.22em] text-white/55">
                  {section.group}
                </p>
              ) : null}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      clsx(
                        "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-bold transition-all duration-200",
                        isActive
                          ? "bg-white text-brand-950 shadow-[0_12px_24px_rgba(0,0,0,0.1)] translate-x-1"
                          : "text-white/80 hover:bg-white/10 hover:text-white",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={clsx(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                            isActive
                              ? "bg-brand-50 text-brand-950 shadow-sm"
                              : "bg-white/5 text-white/70 group-hover:bg-white/15 group-hover:text-white",
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                        </span>
                        <span className={clsx("truncate font-black tracking-tight", isActive ? "text-brand-950" : "text-white")}>
                          {item.label}
                        </span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
