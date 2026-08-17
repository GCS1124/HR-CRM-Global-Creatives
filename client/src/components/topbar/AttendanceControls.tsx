import { ChevronDown } from "lucide-react";
import type { AttendanceCheckInMode } from "../../types/hr";

interface AttendanceControlsProps {
  checkInAt: number | null;
  checkedOut: boolean;
  attendanceBusy: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCheckIn: (mode: AttendanceCheckInMode) => void;
  onCheckOut: () => void;
  disabled?: boolean;
}

export function AttendanceControls({
  checkInAt,
  checkedOut,
  attendanceBusy,
  menuOpen,
  onToggleMenu,
  onCheckIn,
  onCheckOut,
  disabled = false,
}: AttendanceControlsProps) {
  const checkInDisabled = attendanceBusy || Boolean(checkInAt) || checkedOut || disabled;
  const checkOutDisabled = attendanceBusy || !checkInAt || disabled;

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={onToggleMenu}
          disabled={checkInDisabled}
          className="topbar-accent-button topbar-accent-button--success inline-flex items-center gap-2 rounded-full border border-emerald-600 bg-emerald-400 px-2.5 py-1.5 text-[0.58rem] font-black uppercase tracking-widest shadow-[0_10px_22px_rgba(5,150,105,0.2)] transition hover:brightness-105 disabled:opacity-50 sm:px-3 sm:py-2 sm:text-[0.65rem] dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100"
        >
          {checkInAt ? "Checked in" : checkedOut ? "Checked out" : "Check in"}
          <ChevronDown className={`h-3.5 w-3.5 transition ${menuOpen ? "rotate-180" : ""}`} />
        </button>
        
        {menuOpen ? (
          <div className="absolute left-0 top-full z-50 mt-2 w-48 rounded-xl border border-emerald-500/30 bg-emerald-100/95 p-1.5 shadow-panel backdrop-blur-md dark:border-emerald-500/25 dark:bg-slate-950/96">
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => onCheckIn("office")}
                className="w-full rounded-lg bg-emerald-400 px-3 py-2 text-left text-[0.6rem] font-black uppercase tracking-widest text-emerald-950 shadow-sm transition hover:brightness-105 dark:bg-emerald-500/20 dark:text-emerald-100"
              >
                Check in office
              </button>
              <button
                type="button"
                onClick={() => onCheckIn("remote")}
                className="w-full rounded-lg bg-emerald-400 px-3 py-2 text-left text-[0.6rem] font-black uppercase tracking-widest text-emerald-950 shadow-sm transition hover:brightness-105 dark:bg-emerald-500/20 dark:text-emerald-100"
              >
                Check in remote
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onCheckOut}
        disabled={checkOutDisabled}
        className="topbar-accent-button topbar-accent-button--danger rounded-full border border-rose-600 bg-rose-400 px-2.5 py-1.5 text-[0.58rem] font-black uppercase tracking-widest shadow-[0_10px_22px_rgba(136,19,55,0.2)] transition hover:brightness-105 disabled:opacity-50 sm:px-3 sm:py-2 sm:text-[0.65rem] dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-100"
      >
        Check out
      </button>
    </div>
  );
}
