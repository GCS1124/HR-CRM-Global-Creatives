import { Bell, CornerDownLeft, Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { NavItem } from "../types/navigation";

interface WorkspaceCommandPaletteProps {
  isOpen: boolean;
  items: NavItem[];
  workspaceLabel: string;
  onClose: () => void;
  onOpenNotifications?: () => void;
}

interface PaletteItem {
  id: string;
  label: string;
  description: string;
  keywords: string;
  perform: () => void;
  icon: NavItem["icon"];
}

export function WorkspaceCommandPalette({
  isOpen,
  items,
  workspaceLabel,
  onClose,
  onOpenNotifications,
}: WorkspaceCommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const paletteItems = useMemo<PaletteItem[]>(() => {
    const navItems = items
      .filter((item) => !item.footerOnly)
      .map((item) => ({
        id: item.path,
        label: item.label,
        description: `Navigate to ${item.label.toLowerCase()}.`,
        keywords: `${item.label} ${item.path}`,
        perform: () => {
          navigate(item.path);
          onClose();
        },
        icon: item.icon,
      }));

    if (!onOpenNotifications) {
      return navItems;
    }

    return [
      {
        id: "palette-alerts",
        label: "Open alerts",
        description: "Review notifications, payroll reminders, and leave updates.",
        keywords: "alerts notifications updates inbox",
        perform: () => {
          onOpenNotifications();
          onClose();
        },
        icon: Bell,
      },
      ...navItems,
    ];
  }, [items, navigate, onClose, onOpenNotifications]);

  const filteredItems = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) {
      return paletteItems;
    }

    return paletteItems.filter((item) =>
      `${item.label} ${item.description} ${item.keywords}`.toLowerCase().includes(normalized),
    );
  }, [deferredQuery, paletteItems]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/38 px-4 py-10 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[30px] border border-white/40 bg-white/86 shadow-[0_38px_120px_rgba(15,23,42,0.24)] backdrop-blur-xl">
        <div className="border-b border-slate-200/80 px-5 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${workspaceLabel.toLowerCase()} routes and actions`}
              className="w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
            />
            <span className="rounded-full border border-slate-200 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500">
              Esc
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white p-1 text-slate-500 transition hover:text-slate-700"
              aria-label="Close search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-2">
            <div>
              <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-brand-800">Quick Command</p>
              <p className="text-sm font-medium text-slate-600">Navigate faster across the HR CRM shell.</p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.7rem] font-semibold text-slate-500 sm:inline-flex">
              <CornerDownLeft className="h-3.5 w-3.5" />
              Press Enter on a result
            </div>
          </div>

          <div className="grid gap-2">
            {filteredItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-slate-700">No matching route or action.</p>
                <p className="mt-1 text-sm text-slate-500">Try searching for attendance, payroll, leave, or alerts.</p>
              </div>
            ) : null}

            {filteredItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={item.perform}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{item.label}</p>
                    <p className="truncate text-sm text-slate-500">{item.description}</p>
                  </div>
                </div>
                <span className="hidden rounded-full border border-slate-200 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-400 sm:inline-flex">
                  {index + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
