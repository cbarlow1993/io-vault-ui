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

  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-1 text-left font-medium hover:text-neutral-900',
        className
      )}
      onClick={() => column.toggleSorting()}
    >
      {title}
      {column.getIsSorted() === 'asc' ? (
        <ArrowUpIcon className="size-3" />
      ) : column.getIsSorted() === 'desc' ? (
        <ArrowDownIcon className="size-3" />
      ) : (
        <ChevronsUpDownIcon className="size-3 text-neutral-400" />
      )}
    </button>
  );
}
