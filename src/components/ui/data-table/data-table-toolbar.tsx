import type { Table } from '@tanstack/react-table';
import { SearchIcon, XIcon } from 'lucide-react';

import { DataTableColumnVisibility } from './data-table-column-visibility';

interface DataTableToolbarProps<TData> {
  table?: Table<TData>;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  hasActiveFilters = false,
  onClearFilters,
  actions,
  children,
}: DataTableToolbarProps<TData>) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
      <div className="flex items-center gap-3">
        {/* Search */}
        {onSearchChange && (
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label={searchPlaceholder}
              className="h-7 w-48 border border-neutral-200 bg-neutral-50 pr-2 pl-7 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
            />
          </div>
        )}

        {/* Filter children */}
        {children}

        {/* Clear Filters */}
        {hasActiveFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="flex h-7 items-center gap-1 px-2 text-xs text-neutral-500 hover:text-neutral-900"
          >
            <XIcon className="size-3" />
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Column visibility */}
        {table && <DataTableColumnVisibility table={table} />}

        {/* Actions */}
        {actions}
      </div>
    </div>
  );
}

DataTableToolbar.displayName = 'DataTableToolbar';
