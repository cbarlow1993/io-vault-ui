import type { Column } from '@tanstack/react-table';
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>;
  }

  const sortDirection = column.getIsSorted();
  const sortLabel =
    sortDirection === 'asc'
      ? `Sort ${title} descending`
      : sortDirection === 'desc'
        ? `Clear ${title} sort`
        : `Sort ${title} ascending`;

  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-1 text-left font-medium hover:text-neutral-900',
        className
      )}
      onClick={() => column.toggleSorting()}
      aria-label={sortLabel}
    >
      {title}
      {sortDirection === 'asc' ? (
        <ArrowUpIcon className="size-3" />
      ) : sortDirection === 'desc' ? (
        <ArrowDownIcon className="size-3" />
      ) : (
        <ChevronsUpDownIcon className="size-3 text-neutral-400" />
      )}
    </button>
  );
}
