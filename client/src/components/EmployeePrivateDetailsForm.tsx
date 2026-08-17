import type { EmployeeProfileDetailsPayload } from "../types/hr";

interface EmployeePrivateDetailsFormProps {
  value: EmployeeProfileDetailsPayload;
  onChange: (field: keyof EmployeeProfileDetailsPayload, value: string) => void;
  onSubmit: () => void | Promise<void>;
  submitting: boolean;
  submitLabel: string;
  error?: string | null;
  successMessage?: string | null;
  className?: string;
}

const fieldMeta: Array<{
  field: keyof EmployeeProfileDetailsPayload;
  label: string;
  placeholder: string;
  type?: string;
}> = [
  { field: "mobile", label: "Mobile", placeholder: "Enter mobile number", type: "tel" },
  { field: "pan", label: "PAN", placeholder: "ABCDE1234F" },
  { field: "bankName", label: "Bank name", placeholder: "Enter bank name" },
  { field: "bankAccountNumber", label: "Account number", placeholder: "Enter bank account number" },
];

export function EmployeePrivateDetailsForm({
  value,
  onChange,
  onSubmit,
  submitting,
  submitLabel,
  error = null,
  successMessage = null,
  className,
}: EmployeePrivateDetailsFormProps) {
  return (
    <div className={className}>
      <div className="grid gap-3 sm:grid-cols-2">
        {fieldMeta.map((item) => (
          <div key={item.field}>
            <label className="mb-2 block text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
              {item.label}
            </label>
            <input
              type={item.type ?? "text"}
              value={value[item.field]}
              onChange={(event) => onChange(item.field, event.target.value)}
              placeholder={item.placeholder}
              className="input-surface w-full"
            />
          </div>
        ))}
      </div>

      <div className="mt-3">
        <label className="mb-2 block text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
          Address
        </label>
        <textarea
          value={value.address}
          onChange={(event) => onChange("address", event.target.value)}
          placeholder="Enter full residential address"
          rows={4}
          className="input-surface w-full resize-y"
        />
      </div>

      {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200">{error}</p> : null}
      {successMessage ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">{successMessage}</p> : null}

      <button type="button" onClick={() => void onSubmit()} disabled={submitting} className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-70">
        {submitting ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}
