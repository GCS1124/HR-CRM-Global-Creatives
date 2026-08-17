import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentTheme, toggleTheme, type ThemeMode } from "../utils/theme";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>(() => getCurrentTheme());

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ThemeMode>).detail;
      if (detail) {
        setTheme(detail);
        return;
      }
      setTheme(getCurrentTheme());
    };

    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, []);

  const handleToggle = () => {
    const next = toggleTheme();
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-white/55 bg-white/68 px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:bg-white dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800 ${className ?? ""}`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
