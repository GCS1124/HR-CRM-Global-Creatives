export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "gcs-hrcrm-theme";

const isThemeMode = (value: string | null): value is ThemeMode => value === "light" || value === "dark";

export const getCurrentTheme = (): ThemeMode => {
  if (typeof document === "undefined") {
    return "dark";
  }
  const theme = document.documentElement.dataset.theme;
  return theme === "light" ? "light" : "dark";
};

export const applyTheme = (mode: ThemeMode) => {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.dataset.theme = mode;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, mode);
    window.dispatchEvent(new CustomEvent("theme-change", { detail: mode }));
  }
};

export const initTheme = () => {
  if (typeof window === "undefined") {
    return;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  const mode: ThemeMode = isThemeMode(stored) ? stored : "dark";
  applyTheme(mode);
};

export const toggleTheme = (): ThemeMode => {
  const next = getCurrentTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
};
