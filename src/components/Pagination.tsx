import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useT } from '../i18n';

export function usePagination<T>(items: readonly T[], pageSize: number) {
  const [requestedPage, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  // Clamp instead of resetting so shrinking lists (filters, removed items) never show an empty page.
  const page = Math.min(requestedPage, pageCount - 1);
  return {
    page,
    pageCount,
    pageItems: items.slice(page * pageSize, (page + 1) * pageSize),
    setPage,
  };
}

interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  const t = useT();
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button
        type="button"
        aria-label={t('common.prevPage')}
        className="btn btn-ghost size-9"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        aria-label={t('common.nextPage')}
        className="btn btn-ghost size-9"
        disabled={page >= pageCount - 1}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={16} />
      </button>
      <span className="ml-3 min-w-12 text-sm tabular-nums text-slate-400">
        {page + 1} / {pageCount}
      </span>
    </div>
  );
}
