# DataTable Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a reusable DataTable component with TanStack Table v8 that provides server-side pagination, column sorting, visibility toggles, and single row selection.

**Architecture:** Component-based design with DataTable as the main orchestrator, composed of DataTablePagination, DataTableToolbar, DataTableColumnHeader, and DataTableSkeleton. Uses TanStack Table v8 for state management and React Query for data fetching.

**Tech Stack:** TanStack Table v8, React, TypeScript, Tailwind CSS, Lucide icons, existing DropdownMenu component

---

## Task 1: Install TanStack Table

**Files:**
- Modify: `package.json`

**Step 1: Install dependency**

```bash
pnpm add @tanstack/react-table
```

**Step 2: Verify installation**

```bash
pnpm list @tanstack/react-table
```

Expected: Shows `@tanstack/react-table` version 8.x

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @tanstack/react-table dependency"
```

---

## Task 2: Create DataTable Types

**Files:**
- Create: `src/components/ui/data-table/types.ts`

**Step 1: Create types file**

```typescript
import type { ColumnDef, PaginationState, SortingState, VisibilityState } from '@tanstack/react-table';

export type { ColumnDef, PaginationState, SortingState, VisibilityState };

export type DataTableProps<TData> = {
  // Data
  columns: ColumnDef<TData, unknown>[];
  data: TData[];

  // Pagination (controlled)
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  rowCount?: number; // Total rows for server-side pagination
  pageSizeOptions?: number[];

  // Sorting
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;

  // Column visibility
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;

  // Row selection
  selectedRowId?: string;
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;

  // States
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;

  // Slots
  loadingState?: React.ReactNode;
  emptyState?: React.ReactNode;
  errorState?: React.ReactNode;

  // Children (toolbar)
  children?: React.ReactNode;
};

export type DataTableToolbarProps = {
  // Search
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;

  // Filters
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;

  // Actions
  actions?: React.ReactNode;

  // Column visibility (injected by DataTable)
  table?: unknown; // Will be Table<TData>

  // Filter children
  children?: React.ReactNode;
};

export type DataTableColumnHeaderProps<TData, TValue> = {
  column: import('@tanstack/react-table').Column<TData, TValue>;
  title: string;
  className?: string;
};

export type DataTablePaginationProps = {
  table: import('@tanstack/react-table').Table<unknown>;
  pageSizeOptions?: number[];
};
```

**Step 2: Commit**

```bash
git add src/components/ui/data-table/types.ts
git commit -m "feat(data-table): add TypeScript types"
```

---

## Task 3: Create DataTableColumnHeader

**Files:**
- Create: `src/components/ui/data-table/data-table-column-header.tsx`

**Step 1: Create the component**

```tsx
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import type { DataTableColumnHeaderProps } from './types';

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>;
  }

  const sorted = column.getIsSorted();

  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className={cn(
        'flex items-center gap-1 hover:text-neutral-900',
        className
      )}
    >
      {title}
      {sorted === 'asc' ? (
        <ArrowUpIcon className="size-3" />
      ) : sorted === 'desc' ? (
        <ArrowDownIcon className="size-3" />
      ) : (
        <ChevronsUpDownIcon className="size-3 text-neutral-400" />
      )}
    </button>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ui/data-table/data-table-column-header.tsx
git commit -m "feat(data-table): add sortable column header"
```

---

## Task 4: Create DataTableSkeleton

**Files:**
- Create: `src/components/ui/data-table/data-table-skeleton.tsx`

**Step 1: Create the skeleton component**

```tsx
import { Skeleton } from '@/components/ui/skeleton';

type DataTableSkeletonProps = {
  columnCount: number;
  rowCount: number;
};

export function DataTableSkeleton({
  columnCount,
  rowCount,
}: DataTableSkeletonProps) {
  return (
    <tbody className="divide-y divide-neutral-100">
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <td key={colIndex} className="px-3 py-2">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ui/data-table/data-table-skeleton.tsx
git commit -m "feat(data-table): add loading skeleton"
```

---

## Task 5: Create DataTablePagination

**Files:**
- Create: `src/components/ui/data-table/data-table-pagination.tsx`

**Step 1: Create the pagination component**

```tsx
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { FilterSelect } from '@/features/treasury-6-demo/components/filter-select';

import type { DataTablePaginationProps } from './types';

type SelectOption = { id: string; label: string };

export function DataTablePagination({
  table,
  pageSizeOptions = [10, 25, 50],
}: DataTablePaginationProps) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getRowCount();
  const pageCount = table.getPageCount();

  const startRow = pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  const pageSizeSelectOptions: SelectOption[] = pageSizeOptions.map((size) => ({
    id: String(size),
    label: String(size),
  }));

  const currentPageSizeOption = pageSizeSelectOptions.find(
    (opt) => opt.id === String(pageSize)
  );

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const currentPage = pageIndex + 1; // 1-based for display

    for (let i = 1; i <= pageCount; i++) {
      if (i === 1 || i === pageCount || Math.abs(i - currentPage) <= 1) {
        if (pages.length > 0) {
          const lastPage = pages[pages.length - 1];
          if (typeof lastPage === 'number' && i - lastPage > 1) {
            pages.push('ellipsis');
          }
        }
        pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();
  const currentPage = pageIndex + 1;
  const isFirstPage = pageIndex === 0;
  const isLastPage = pageIndex >= pageCount - 1;

  const buttonClass = (disabled: boolean) =>
    cn(
      'flex size-7 items-center justify-center border border-neutral-200',
      disabled
        ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
        : 'bg-white text-neutral-600 hover:bg-neutral-50'
    );

  return (
    <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500">Rows per page:</span>
        <FilterSelect
          options={pageSizeSelectOptions}
          value={currentPageSizeOption ?? null}
          onChange={(opt) => {
            table.setPageSize(Number(opt.id));
          }}
          className="w-16"
        />
      </div>

      <div className="flex items-center gap-1">
        <span className="mr-2 text-xs text-neutral-500">
          {startRow}-{endRow} of {totalRows}
        </span>

        {/* First page */}
        <button
          type="button"
          onClick={() => table.setPageIndex(0)}
          disabled={isFirstPage}
          className={buttonClass(isFirstPage)}
        >
          <ChevronsLeftIcon className="size-3.5" />
        </button>

        {/* Previous page */}
        <button
          type="button"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className={buttonClass(!table.getCanPreviousPage())}
        >
          <ChevronLeftIcon className="size-3.5" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((item, idx) =>
            item === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-neutral-400">
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => table.setPageIndex(item - 1)}
                className={cn(
                  'flex size-7 items-center justify-center border text-xs',
                  currentPage === item
                    ? 'border-neutral-900 bg-neutral-900 font-medium text-white'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
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
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className={buttonClass(!table.getCanNextPage())}
        >
          <ChevronRightIcon className="size-3.5" />
        </button>

        {/* Last page */}
        <button
          type="button"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={isLastPage || pageCount === 0}
          className={buttonClass(isLastPage || pageCount === 0)}
        >
          <ChevronsRightIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ui/data-table/data-table-pagination.tsx
git commit -m "feat(data-table): add pagination controls"
```

---

## Task 6: Create DataTableColumnVisibility

**Files:**
- Create: `src/components/ui/data-table/data-table-column-visibility.tsx`

**Step 1: Create the column visibility dropdown**

```tsx
import type { Table } from '@tanstack/react-table';
import { ChevronDownIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type DataTableColumnVisibilityProps<TData> = {
  table: Table<TData>;
};

export function DataTableColumnVisibility<TData>({
  table,
}: DataTableColumnVisibilityProps<TData>) {
  const columns = table
    .getAllColumns()
    .filter((column) => column.getCanHide());

  if (columns.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-7 items-center gap-1 border border-neutral-200 bg-white px-2 text-xs text-neutral-600 hover:bg-neutral-50"
        >
          Columns
          <ChevronDownIcon className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-none">
        {columns.map((column) => {
          const header = column.columnDef.header;
          const title =
            typeof header === 'string'
              ? header
              : column.id.charAt(0).toUpperCase() + column.id.slice(1);

          return (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
              className="cursor-pointer rounded-none text-xs"
            >
              {title}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ui/data-table/data-table-column-visibility.tsx
git commit -m "feat(data-table): add column visibility dropdown"
```

---

## Task 7: Create DataTableToolbar

**Files:**
- Create: `src/components/ui/data-table/data-table-toolbar.tsx`

**Step 1: Create the toolbar component**

```tsx
import type { Table } from '@tanstack/react-table';
import { SearchIcon, XIcon } from 'lucide-react';

import { DataTableColumnVisibility } from './data-table-column-visibility';
import type { DataTableToolbarProps } from './types';

type DataTableToolbarWithTableProps<TData> = DataTableToolbarProps & {
  table: Table<TData>;
  resultCount?: number;
};

export function DataTableToolbar<TData>({
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  hasActiveFilters = false,
  onClearFilters,
  actions,
  table,
  resultCount,
  children,
}: DataTableToolbarWithTableProps<TData>) {
  return (
    <div className="flex items-center justify-between border border-neutral-200 bg-white px-3 py-2">
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
              className="h-7 w-48 border border-neutral-200 bg-neutral-50 pr-2 pl-7 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
            />
          </div>
        )}

        {/* Filter children */}
        {children}

        {/* Clear filters */}
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

      <div className="flex items-center gap-3">
        {/* Results count */}
        {resultCount !== undefined && (
          <span className="text-xs text-neutral-500">
            {resultCount} {resultCount === 1 ? 'result' : 'results'}
          </span>
        )}

        {/* Column visibility */}
        <DataTableColumnVisibility table={table} />

        {/* Custom actions */}
        {actions}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ui/data-table/data-table-toolbar.tsx
git commit -m "feat(data-table): add toolbar with search and filters"
```

---

## Task 8: Create Main DataTable Component

**Files:**
- Create: `src/components/ui/data-table/data-table.tsx`

**Step 1: Create the main component**

```tsx
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { AlertCircleIcon, InboxIcon } from 'lucide-react';
import { Children, cloneElement, isValidElement, useMemo, useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';

import { DataTablePagination } from './data-table-pagination';
import { DataTableSkeleton } from './data-table-skeleton';
import { DataTableToolbar } from './data-table-toolbar';
import type { DataTableProps, DataTableToolbarProps } from './types';

export function DataTable<TData>({
  columns,
  data,
  pagination,
  onPaginationChange,
  rowCount,
  pageSizeOptions = [10, 25, 50],
  sorting: sortingProp,
  onSortingChange,
  columnVisibility: columnVisibilityProp,
  onColumnVisibilityChange,
  selectedRowId,
  onRowClick,
  getRowId,
  isLoading = false,
  isError = false,
  onRetry,
  loadingState,
  emptyState,
  errorState,
  children,
}: DataTableProps<TData>) {
  // Internal state for uncontrolled mode
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSizeOptions[0] ?? 10,
  });
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalVisibility, setInternalVisibility] = useState<VisibilityState>({});

  // Use controlled or internal state
  const paginationState = pagination ?? internalPagination;
  const sortingState = sortingProp ?? internalSorting;
  const visibilityState = columnVisibilityProp ?? internalVisibility;

  const table = useReactTable({
    data,
    columns,
    rowCount: rowCount ?? data.length,
    state: {
      pagination: paginationState,
      sorting: sortingState,
      columnVisibility: visibilityState,
    },
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === 'function' ? updater(paginationState) : updater;
      if (onPaginationChange) {
        onPaginationChange(newState);
      } else {
        setInternalPagination(newState);
      }
    },
    onSortingChange: (updater) => {
      const newState =
        typeof updater === 'function' ? updater(sortingState) : updater;
      if (onSortingChange) {
        onSortingChange(newState);
      } else {
        setInternalSorting(newState);
      }
    },
    onColumnVisibilityChange: (updater) => {
      const newState =
        typeof updater === 'function' ? updater(visibilityState) : updater;
      if (onColumnVisibilityChange) {
        onColumnVisibilityChange(newState);
      } else {
        setInternalVisibility(newState);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: rowCount === undefined ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getRowId: getRowId ?? ((row, index) => String(index)),
    manualPagination: rowCount !== undefined,
  });

  // Find and enhance toolbar child with table instance
  const enhancedChildren = useMemo(() => {
    return Children.map(children, (child) => {
      if (isValidElement(child) && child.type === DataTableToolbar) {
        return cloneElement(child as React.ReactElement<DataTableToolbarProps>, {
          table,
          resultCount: rowCount ?? data.length,
        });
      }
      return child;
    });
  }, [children, table, rowCount, data.length]);

  // Default empty state
  const defaultEmptyState = (
    <div className="px-4 py-12 text-center">
      <InboxIcon className="mx-auto size-8 text-neutral-300" />
      <p className="mt-2 text-sm text-neutral-500">No results found</p>
      <p className="mt-1 text-xs text-neutral-400">
        Try adjusting your filters
      </p>
    </div>
  );

  // Default error state
  const defaultErrorState = (
    <div className="px-4 py-12 text-center">
      <AlertCircleIcon className="mx-auto size-8 text-negative-400" />
      <p className="mt-2 text-sm text-negative-600">Failed to load data</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-3 h-7 rounded-none text-xs"
        >
          Try again
        </Button>
      )}
    </div>
  );

  const visibleColumns = table.getVisibleLeafColumns();
  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {enhancedChildren}

      {/* Table */}
      <div className="border border-neutral-200 bg-white">
        <table className="w-full text-xs">
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-neutral-100 bg-neutral-50 text-left"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 font-medium text-neutral-500"
                    style={{
                      width: header.column.getSize() !== 150 ? header.column.getSize() : undefined,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* Loading state */}
          {isLoading && (
            loadingState ?? (
              <DataTableSkeleton
                columnCount={visibleColumns.length}
                rowCount={paginationState.pageSize}
              />
            )
          )}

          {/* Error state */}
          {!isLoading && isError && (
            <tbody>
              <tr>
                <td colSpan={visibleColumns.length}>
                  {errorState ?? defaultErrorState}
                </td>
              </tr>
            </tbody>
          )}

          {/* Empty state */}
          {!isLoading && !isError && rows.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={visibleColumns.length}>
                  {emptyState ?? defaultEmptyState}
                </td>
              </tr>
            </tbody>
          )}

          {/* Data rows */}
          {!isLoading && !isError && rows.length > 0 && (
            <tbody className="divide-y divide-neutral-100">
              {rows.map((row) => {
                const isSelected = selectedRowId === row.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      onRowClick && 'cursor-pointer',
                      isSelected ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>

        {/* Pagination */}
        {!isLoading && !isError && (rowCount ?? data.length) > 0 && (
          <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ui/data-table/data-table.tsx
git commit -m "feat(data-table): add main DataTable component"
```

---

## Task 9: Create Index Exports

**Files:**
- Create: `src/components/ui/data-table/index.ts`

**Step 1: Create exports file**

```typescript
export { DataTable } from './data-table';
export { DataTableColumnHeader } from './data-table-column-header';
export { DataTableToolbar } from './data-table-toolbar';
export type {
  ColumnDef,
  DataTableColumnHeaderProps,
  DataTableProps,
  DataTableToolbarProps,
  PaginationState,
  SortingState,
  VisibilityState,
} from './types';
```

**Step 2: Commit**

```bash
git add src/components/ui/data-table/index.ts
git commit -m "feat(data-table): add public exports"
```

---

## Task 10: Create Storybook Stories

**Files:**
- Create: `src/components/ui/data-table/data-table.stories.tsx`

**Step 1: Create stories file**

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { FilterSelect } from '@/features/treasury-6-demo/components/filter-select';

import { DataTable, DataTableColumnHeader, DataTableToolbar } from './index';
import type { ColumnDef, PaginationState } from './types';

type Person = {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: string;
};

const sampleData: Person[] = Array.from({ length: 50 }, (_, i) => ({
  id: String(i + 1),
  name: `Person ${i + 1}`,
  email: `person${i + 1}@example.com`,
  status: i % 3 === 0 ? 'inactive' : 'active',
  createdAt: new Date(2024, 0, i + 1).toLocaleDateString(),
}));

const columns: ColumnDef<Person>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span
        className={
          row.getValue('status') === 'active'
            ? 'text-positive-600'
            : 'text-neutral-500'
        }
      >
        {row.getValue('status')}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    enableSorting: true,
  },
];

const meta: Meta<typeof DataTable<Person>> = {
  title: 'UI/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof DataTable<Person>>;

export const Default: Story = {
  render: () => {
    const [search, setSearch] = useState('');

    const filteredData = sampleData.filter((person) =>
      person.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <DataTable
        columns={columns}
        data={filteredData}
        getRowId={(row) => row.id}
        onRowClick={(row) => console.log('Clicked:', row)}
      >
        <DataTableToolbar
          searchPlaceholder="Search people..."
          searchValue={search}
          onSearchChange={setSearch}
          hasActiveFilters={!!search}
          onClearFilters={() => setSearch('')}
        />
      </DataTable>
    );
  },
};

export const WithFilters: Story = {
  render: () => {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<{ id: string; label: string } | null>({
      id: 'all',
      label: 'All Status',
    });

    const statusOptions = [
      { id: 'all', label: 'All Status' },
      { id: 'active', label: 'Active' },
      { id: 'inactive', label: 'Inactive' },
    ];

    const filteredData = sampleData.filter((person) => {
      if (search && !person.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (status?.id !== 'all' && person.status !== status?.id) {
        return false;
      }
      return true;
    });

    const hasFilters = !!search || status?.id !== 'all';

    return (
      <DataTable
        columns={columns}
        data={filteredData}
        getRowId={(row) => row.id}
      >
        <DataTableToolbar
          searchPlaceholder="Search people..."
          searchValue={search}
          onSearchChange={setSearch}
          hasActiveFilters={hasFilters}
          onClearFilters={() => {
            setSearch('');
            setStatus(statusOptions[0]!);
          }}
        >
          <FilterSelect
            options={statusOptions}
            value={status}
            onChange={setStatus}
            className="w-28"
          />
        </DataTableToolbar>
      </DataTable>
    );
  },
};

export const Loading: Story = {
  render: () => (
    <DataTable columns={columns} data={[]} isLoading>
      <DataTableToolbar searchPlaceholder="Search people..." />
    </DataTable>
  ),
};

export const Error: Story = {
  render: () => (
    <DataTable
      columns={columns}
      data={[]}
      isError
      onRetry={() => console.log('Retry clicked')}
    >
      <DataTableToolbar searchPlaceholder="Search people..." />
    </DataTable>
  ),
};

export const Empty: Story = {
  render: () => (
    <DataTable columns={columns} data={[]}>
      <DataTableToolbar searchPlaceholder="Search people..." />
    </DataTable>
  ),
};

export const ServerSidePagination: Story = {
  render: () => {
    const [pagination, setPagination] = useState<PaginationState>({
      pageIndex: 0,
      pageSize: 10,
    });

    // Simulate server-side pagination
    const paginatedData = sampleData.slice(
      pagination.pageIndex * pagination.pageSize,
      (pagination.pageIndex + 1) * pagination.pageSize
    );

    return (
      <DataTable
        columns={columns}
        data={paginatedData}
        rowCount={sampleData.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        getRowId={(row) => row.id}
      >
        <DataTableToolbar searchPlaceholder="Search people..." />
      </DataTable>
    );
  },
};
```

**Step 2: Verify stories work**

```bash
pnpm storybook
```

Navigate to UI/DataTable and verify all stories render correctly.

**Step 3: Commit**

```bash
git add src/components/ui/data-table/data-table.stories.tsx
git commit -m "feat(data-table): add Storybook stories"
```

---

## Task 11: Migrate page-signers.tsx (Example Migration)

**Files:**
- Modify: `src/features/treasury-6-demo/page-signers.tsx`

**Step 1: Update imports**

Add at top of file:
```typescript
import {
  DataTable,
  DataTableColumnHeader,
  DataTableToolbar,
  type ColumnDef,
} from '@/components/ui/data-table';
```

**Step 2: Define columns**

Replace the inline table with column definitions. Add after the existing helper components (around line 130):

```typescript
const getSignerColumns = (
  navigate: ReturnType<typeof useNavigate>,
  setConfigModalSigner: (signer: RegisteredSigner | null) => void,
  setRenameModalSigner: (signer: RegisteredSigner | null) => void,
  setRevokeModalSigner: (signer: RegisteredSigner | null) => void
): ColumnDef<RegisteredSigner>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      const signer = row.original;
      return (
        <div>
          <p className="font-medium text-neutral-900">{signer.name}</p>
          <p className="text-[10px] text-neutral-400">
            {signer.owner} · {signer.deviceInfo}
          </p>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const signer = row.original;
      return (
        <div className="flex items-center gap-2">
          <span className="text-neutral-400">{getTypeIcon(signer.type)}</span>
          <span className="text-neutral-600">{getTypeLabel(signer.type)}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => <VersionBadge signer={row.original} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <span
          className={cn(
            'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
            getStatusStyles(status)
          )}
        >
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: 'vaultsCount',
    header: 'Vaults',
    cell: ({ row }) => (
      <span className="text-neutral-600 tabular-nums">
        {row.getValue('vaultsCount')}
      </span>
    ),
  },
  {
    id: 'lastSeen',
    header: 'Last Seen',
    cell: ({ row }) => <HealthIndicator signer={row.original} />,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const signer = row.original;
      return (
        <div className="text-right" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <MoreHorizontalIcon className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-none">
              <DropdownMenuItem asChild className="cursor-pointer rounded-none text-xs">
                <Link to="/signers/$signerId" params={{ signerId: signer.id }}>
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfigModalSigner(signer)}
                className="cursor-pointer rounded-none text-xs"
              >
                <SettingsIcon className="mr-2 size-3.5" />
                View Config
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setRenameModalSigner(signer)}
                className="cursor-pointer rounded-none text-xs"
              >
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setRevokeModalSigner(signer)}
                className="cursor-pointer rounded-none text-xs text-negative-600"
                disabled={signer.status === 'revoked'}
              >
                Revoke Signer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    enableHiding: false,
  },
];
```

**Step 3: Replace table JSX**

Replace the entire `{/* Signers Table */}` section (approximately lines 356-640) with:

```tsx
{/* Signers Table */}
<DataTable
  columns={columns}
  data={filteredSigners}
  getRowId={(row) => row.id}
  onRowClick={(row) =>
    navigate({ to: '/signers/$signerId', params: { signerId: row.id } })
  }
>
  <DataTableToolbar
    searchPlaceholder="Search signers..."
    searchValue={search}
    onSearchChange={handleSearchChange}
    hasActiveFilters={hasActiveFilters}
    onClearFilters={clearFilters}
  >
    <FilterSelect
      options={STATUS_OPTIONS}
      value={statusFilter}
      onChange={handleStatusChange}
      className="w-28"
    />
    <FilterSelect
      options={TYPE_OPTIONS}
      value={typeFilter}
      onChange={handleTypeChange}
      className="w-28"
    />
  </DataTableToolbar>
</DataTable>
```

**Step 4: Update component to use columns**

Inside the component, add columns definition:

```typescript
const columns = useMemo(
  () =>
    getSignerColumns(
      navigate,
      setConfigModalSigner,
      setRenameModalSigner,
      setRevokeModalSigner
    ),
  [navigate]
);
```

**Step 5: Remove unused state and logic**

Remove:
- `currentPage`, `setCurrentPage` state
- `pageSizeOption`, `setPageSizeOption` state
- `pageSize` calculation
- `totalPages`, `startIndex`, `endIndex`, `paginatedSigners` calculations
- `handlePageSizeChange` function
- `PAGE_SIZE_OPTIONS_SELECT` constant

**Step 6: Verify the page works**

```bash
pnpm dev
```

Navigate to `/signers` and verify:
- Table renders with all columns
- Search works
- Filters work
- Pagination works
- Row click navigates to detail
- Actions dropdown works

**Step 7: Commit**

```bash
git add src/features/treasury-6-demo/page-signers.tsx
git commit -m "refactor(page-signers): migrate to DataTable component"
```

---

## Summary

After completing all tasks, the DataTable component will provide:

1. **Reusable table with TanStack Table v8** - Type-safe column definitions
2. **Server-side pagination support** - Controlled pagination state for React Query
3. **Column sorting** - Click-to-sort with visual indicators
4. **Column visibility** - Toggle columns via dropdown
5. **Single row selection** - Click to select with visual feedback
6. **Loading/empty/error states** - Sensible defaults with override slots
7. **Consistent styling** - Matches existing treasury-6-demo patterns

The migration of page-signers.tsx serves as a template for migrating other pages:
- page-whitelists.tsx
- page-transaction-policies.tsx
- page-identities.tsx
- page-keys.tsx
- etc.

Each migration removes ~100+ lines of inline table/pagination code.
