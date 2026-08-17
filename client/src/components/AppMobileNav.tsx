import clsx from "clsx";
import { NavLink } from "react-router-dom";
import type { NavItem } from "../types/navigation";

interface AppMobileNavProps {
  items: NavItem[];
}

export function AppMobileNav({ items }: AppMobileNavProps) {
  const navItems = items.filter((item) => !item.footerOnly);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/60 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-950/92 lg:hidden">
      <div className="overflow-x-auto">
        <ul className="flex min-w-max items-stretch gap-1 px-2 py-1">
          {navItems.map((item) => (
            <li key={item.path} className="shrink-0">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  clsx(
                    "flex min-w-[4.75rem] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[0.55rem] font-black uppercase tracking-[0.16em] transition-all duration-200",
                    isActive
                      ? "bg-brand-50/50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/80 dark:hover:text-slate-100",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={clsx("h-5 w-5 transition-transform duration-200", isActive && "scale-110")} />
                    <span className="max-w-[72px] truncate text-center leading-tight">{item.label}</span>
                    {isActive && <span className="mt-0.5 h-1 w-4 rounded-full bg-brand-600 dark:bg-brand-300" />}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
