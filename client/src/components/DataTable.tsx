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
      <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50 p-8 text-center text-sm font-semibold text-brand-700/80">
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
    <div className="space-y-3">
      {showExport ? (
        <div className="flex items-center justify-end">
          <button type="button" onClick={handleExport} className="btn-secondary px-3 py-2">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse bg-white/90">
            <thead className="sticky top-0 z-10 bg-[linear-gradient(90deg,#1a2a69,#3b82f6)] text-white">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] ${column.headerClassName ?? ""}`}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={rowKey(row)}
                  className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-brand-50/35"} transition hover:bg-brand-100/55 ${
                    rowClassName ? rowClassName(row, index) : ""
                  }`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`table-cell ${column.cellClassName ?? ""}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
