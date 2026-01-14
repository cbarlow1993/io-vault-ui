import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

interface DataTablePaginationProps {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalRows: number;
  pageSizeOptions: number[];
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
}

export function DataTablePagination({
  pageIndex,
  pageSize,
  pageCount,
  totalRows,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: DataTablePaginationProps) {
  const currentPage = pageIndex + 1; // Convert 0-based to 1-based
  const totalPages = pageCount;
  const startIndex = pageIndex * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRows);

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return pages
      .filter((page) => {
        if (page === 1 || page === totalPages) return true;
        if (Math.abs(page - currentPage) <= 1) return true;
        return false;
      })
      .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
        if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
          acc.push('ellipsis');
        }
        acc.push(page);
        return acc;
      }, []);
  };

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages || totalPages === 0;

  return (
    <nav
      aria-label="Table pagination"
      className="flex items-center justify-between border-t border-neutral-200 px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <label htmlFor="page-size-select" className="text-xs text-neutral-500">
          Rows per page:
        </label>
        <select
          id="page-size-select"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={disabled}
          className="h-7 w-16 border border-neutral-200 bg-neutral-50 px-2 text-xs text-neutral-600 focus:border-neutral-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <span className="mr-2 text-xs text-neutral-500">
          {totalRows > 0
            ? `${startIndex + 1}-${endIndex} of ${totalRows}`
            : '0 results'}
        </span>

        {/* First page */}
        <button
          type="button"
          onClick={() => onPageChange(0)}
          disabled={disabled || isFirstPage}
          aria-label="Go to first page"
          className={cn(
            'border-divider flex size-7 items-center justify-center border',
            disabled || isFirstPage
              ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
              : 'hover-subtle bg-white text-neutral-600'
          )}
        >
          <ChevronsLeftIcon className="size-3.5" />
        </button>

        {/* Previous page */}
        <button
          type="button"
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={disabled || isFirstPage}
          aria-label="Go to previous page"
          className={cn(
            'border-divider flex size-7 items-center justify-center border',
            disabled || isFirstPage
              ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
              : 'hover-subtle bg-white text-neutral-600'
          )}
        >
          <ChevronLeftIcon className="size-3.5" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((item, idx) =>
            item === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-1 text-xs text-neutral-400"
              >
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item - 1)}
                disabled={disabled}
                aria-label={`Go to page ${item}`}
                aria-current={currentPage === item ? 'page' : undefined}
                className={cn(
                  'flex size-7 items-center justify-center border text-xs',
                  currentPage === item
                    ? 'border-neutral-900 bg-neutral-900 font-medium text-white'
                    : 'border-divider hover-subtle bg-white text-neutral-600'
                )}
              >
                {item}
              </button>
            )
          )}
        </div>

        {/* Next page */}
        <button
          type="button"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={disabled || isLastPage}
          aria-label="Go to next page"
          className={cn(
            'border-divider flex size-7 items-center justify-center border',
            disabled || isLastPage
              ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
              : 'hover-subtle bg-white text-neutral-600'
          )}
        >
          <ChevronRightIcon className="size-3.5" />
        </button>

        {/* Last page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, totalPages - 1))}
          disabled={disabled || isLastPage}
          aria-label="Go to last page"
          className={cn(
            'border-divider flex size-7 items-center justify-center border',
            disabled || isLastPage
              ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
              : 'hover-subtle bg-white text-neutral-600'
          )}
        >
          <ChevronsRightIcon className="size-3.5" />
        </button>
      </div>
    </nav>
  );
}
