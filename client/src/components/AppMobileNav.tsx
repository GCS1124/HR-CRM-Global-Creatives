import clsx from "clsx";
import { NavLink } from "react-router-dom";
import type { NavItem } from "../types/navigation";

interface AppMobileNavProps {
  items: NavItem[];
}

export function AppMobileNav({ items }: AppMobileNavProps) {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg lg:hidden">
      <ul className="flex gap-1 overflow-x-auto">
        {items.map((item) => (
          <li key={item.path} className="min-w-[80px] flex-1">
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[0.62rem] font-bold uppercase tracking-[0.06em] transition",
                  isActive ? "bg-brand-900 text-white" : "text-slate-600 hover:bg-slate-100",
                )
              }
            >
              <item.icon className="h-3.5 w-3.5" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
