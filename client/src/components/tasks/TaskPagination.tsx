interface TaskPaginationProps {
  page: number;
  pageCount: number;
  totalCount: number;
  pageSize: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function TaskPagination({ page, pageCount, totalCount, pageSize, onPrevious, onNext }: TaskPaginationProps) {
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-nowrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700/60 dark:bg-slate-950/80">
      <p className="whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
        {start}-{end} of {totalCount} tasks
      </p>
      <div className="flex flex-nowrap items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={page <= 1}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-200"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= pageCount}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-200"
        >
          Next
        </button>
        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300">
          Page {page} of {pageCount}
        </span>
      </div>
    </div>
  );
}
