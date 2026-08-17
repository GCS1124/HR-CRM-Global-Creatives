import { Download } from "lucide-react";
import { isValidElement, type ReactNode } from "react";

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  exportValue?: (row: T) => string | number | boolean | null | undefined | Date;
}

interface DataTableProps<T> {
  columns: Array<TableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  emptyText?: string;
  rowClassName?: (row: T, index: number) => string;
  exportFileName?: string;
  showExport?: boolean;
}

const extractText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(extractText).filter(Boolean).join(" ").trim();
  }

  if (isValidElement(node)) {
    const props = node.props as {
      children?: ReactNode;
      value?: ReactNode;
      label?: ReactNode;
      title?: ReactNode;
      text?: ReactNode;
    };
    const fallback = props.children ?? props.value ?? props.label ?? props.title ?? props.text;
    return fallback ? extractText(fallback) : "";
  }

  return "";
};

const formatCsvValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized = value instanceof Date ? value.toISOString() : String(value);
  const escaped = normalized.replace(/"/g, "\"\"");
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyText = "No records found",
  rowClassName,
  exportFileName = "table-export",
  showExport = true,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50 p-8 text-center text-sm font-bold text-brand-700/80 dark:border-slate-700/60 dark:bg-slate-950/70 dark:text-slate-300">
        {emptyText}
      </div>
    );
  }

  const handleExport = () => {
    const headers = columns.map((column) => extractText(column.header) || column.key);
    const csvRows = [
      headers.map(formatCsvValue).join(","),
      ...rows.map((row) =>
        columns
          .map((column) => {
            const raw =
              column.exportValue?.(row) ?? (row as Record<string, unknown>)[column.key] ?? extractText(column.render(row));
            return formatCsvValue(raw);
          })
          .join(","),
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportFileName}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {showExport ? (
        <div className="flex items-center justify-end">
          <button type="button" onClick={handleExport} className="btn-secondary px-3 py-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      ) : null}

      {/* Desktop Table View */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 shadow-soft dark:border-slate-700/60 dark:bg-slate-950/80 md:block">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full border-collapse">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900/80">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className={`px-4 py-3.5 text-left text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300 ${column.headerClassName ?? ""}`}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={rowKey(row)}
                  className={`border-b border-slate-100 last:border-0 transition-colors hover:bg-brand-50/50 dark:border-slate-800/80 dark:hover:bg-slate-800/70 ${
                    rowClassName ? rowClassName(row, index) : ""
                  }`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-100 ${column.cellClassName ?? ""}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {rows.map((row, index) => (
          <div
            key={rowKey(row)}
            className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-transform active:scale-[0.99] dark:border-slate-700/60 dark:bg-slate-900/80 ${
              rowClassName ? rowClassName(row, index) : ""
            }`}
          >
            <div className="space-y-4">
              {columns.map((column) => {
                if (column.key === "actions") {
                  return (
                    <div key={column.key} className="border-t border-slate-100 pt-2 dark:border-slate-700/60">
                      {column.render(row)}
                    </div>
                  );
                }

                if (column.key === "select") {
                  return (
                    <div key={column.key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700/60 dark:bg-slate-950/70">
                      <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300">Select</span>
                      {column.render(row)}
                    </div>
                  );
                }

                const headerLabel = extractText(column.header) || column.key;
                return (
                  <div key={column.key} className="flex flex-col gap-1">
                    <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300">
                      {headerLabel}
                    </span>
                    <div className="break-words text-sm font-bold text-slate-900 dark:text-slate-50">
                      {column.render(row)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
