import { useState } from "react";
import { LogOut, ShieldAlert, UserPlus, X } from "lucide-react";

interface NewUserSetupModalProps {
  email?: string | null;
  onClose?: () => void;
  onSignOut?: () => void;
}

export function NewUserSetupModal({ email, onClose, onSignOut }: NewUserSetupModalProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-brand-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[0.7rem] font-black uppercase tracking-[0.18em] text-brand-700">New User</p>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-slate-200 bg-white p-1 text-slate-500 transition hover:text-slate-700"
                aria-label="Close setup notice"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
              Ask admin to add you as an employee
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Your account was created, but there is no employee record linked to it yet. Ask an admin to add you as
              an employee in HR CRM, then sign in again.
            </p>
            {email ? (
              <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">Account Email</p>
                <p className="mt-1 break-all text-sm font-semibold text-brand-950">{email}</p>
              </div>
            ) : null}
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <UserPlus className="h-4 w-4 text-brand-700" />
                Admin action needed
              </div>
              <p className="mt-2">
                Once the admin creates or links your employee profile, refresh the page or sign in again.
              </p>
            </div>
            {onSignOut ? (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
