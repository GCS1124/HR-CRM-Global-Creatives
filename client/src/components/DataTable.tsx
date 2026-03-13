import type { ReactNode } from "react";

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface DataTableProps<T> {
  columns: Array<TableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  emptyText?: string;
  rowClassName?: (row: T, index: number) => string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyText = "No records found",
  rowClassName,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50 p-8 text-center text-sm font-semibold text-brand-700/80">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-brand-200/80 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse bg-white/90">
          <thead className="sticky top-0 z-10 bg-brand-900 text-white">
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
                className={`${index % 2 === 0 ? "bg-white" : "bg-brand-50/35"} transition hover:bg-brand-100/55 ${
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
  );
}
