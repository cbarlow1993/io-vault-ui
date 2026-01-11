import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import { AlertTriangleIcon, InboxIcon } from 'lucide-react';
import {
  Children,
  cloneElement,
  isValidElement,
  useMemo,
  useState,
} from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';

import { DataTablePagination } from './data-table-pagination';
import { DataTableSkeleton } from './data-table-skeleton';
import { DataTableToolbar } from './data-table-toolbar';

interface DataTableProps<TData> {
  // Data
  columns: ColumnDef<TData, unknown>[];
  data: TData[];

  // Pagination
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  rowCount?: number;
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

  // Custom state slots
  loadingState?: React.ReactNode;
  emptyState?: React.ReactNode;
  errorState?: React.ReactNode;

  // Toolbar (passed as children)
  children?: React.ReactNode;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50];

export function DataTable<TData>({
  columns,
  data,
  pagination: controlledPagination,
  onPaginationChange,
  rowCount,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  sorting: controlledSorting,
  onSortingChange,
  columnVisibility: controlledColumnVisibility,
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
  const [internalPagination, setInternalPagination] = useState<PaginationState>(
    {
      pageIndex: 0,
      pageSize: pageSizeOptions[0] ?? 10,
    }
  );
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalColumnVisibility, setInternalColumnVisibility] =
    useState<VisibilityState>({});

  // Use controlled or internal state
  const pagination = controlledPagination ?? internalPagination;
  const sorting = controlledSorting ?? internalSorting;
  const columnVisibility =
    controlledColumnVisibility ?? internalColumnVisibility;

  // Determine if server-side pagination
  const isServerSide =
    rowCount !== undefined && onPaginationChange !== undefined;

  // Guard against division by zero
  const safePageSize = Math.max(1, pagination.pageSize);

  const table = useReactTable({
    data,
    columns,
    pageCount: isServerSide ? Math.ceil(rowCount / safePageSize) : undefined,
    state: {
      pagination,
      sorting,
      columnVisibility,
    },
    onPaginationChange: (updater) => {
      const newPagination =
        typeof updater === 'function' ? updater(pagination) : updater;
      if (onPaginationChange) {
        onPaginationChange(newPagination);
      } else {
        setInternalPagination(newPagination);
      }
    },
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === 'function' ? updater(sorting) : updater;
      if (onSortingChange) {
        onSortingChange(newSorting);
      } else {
        setInternalSorting(newSorting);
      }
    },
    onColumnVisibilityChange: (updater) => {
      const newVisibility =
        typeof updater === 'function' ? updater(columnVisibility) : updater;
      if (onColumnVisibilityChange) {
        onColumnVisibilityChange(newVisibility);
      } else {
        setInternalColumnVisibility(newVisibility);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: isServerSide ? undefined : getPaginationRowModel(),
    manualPagination: isServerSide,
    manualSorting: !!onSortingChange,
    getRowId,
  });

  const totalRows = rowCount ?? data.length;
  const pageCount = Math.ceil(totalRows / safePageSize);

  // Clone toolbar children with table instance
  // Uses displayName to handle wrapped components (memo, forwardRef, HOCs)
  const toolbarWithTable = useMemo(() => {
    return Children.map(children, (child) => {
      if (isValidElement(child)) {
        const childType = child.type as React.ComponentType & {
          displayName?: string;
        };
        const isToolbar =
          childType === DataTableToolbar ||
          childType.displayName === 'DataTableToolbar';
        if (isToolbar) {
          return cloneElement(child, { table } as React.Attributes);
        }
      }
      return child;
    });
  }, [children, table]);

  // Default empty state
  const defaultEmptyState = (
    <div className="flex flex-col items-center justify-center py-12">
      <InboxIcon className="size-10 text-neutral-300" />
      <p className="mt-3 text-sm font-medium text-neutral-900">
        No results found
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        Try adjusting your search or filters
      </p>
    </div>
  );

  // Default error state
  const defaultErrorState = (
    <div className="flex flex-col items-center justify-center py-12">
      <AlertTriangleIcon className="size-10 text-negative-400" />
      <p className="mt-3 text-sm font-medium text-neutral-900">
        Failed to load data
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        An error occurred while loading the data
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          className="mt-4 h-8 rounded-none px-4 text-xs"
          variant="secondary"
        >
          Try again
        </Button>
      )}
    </div>
  );

  return (
    <div className="border border-neutral-200 bg-white">
      {/* Toolbar */}
      {toolbarWithTable}

      {/* Table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
            {table.getHeaderGroups().map((headerGroup) =>
              headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 font-medium text-neutral-500"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))
            )}
          </tr>
        </thead>

        {/* Table body with aria-live for state announcements */}
        {isLoading ? (
          loadingState ? (
            <tbody aria-live="polite" aria-busy="true">
              <tr>
                <td colSpan={columns.length}>{loadingState}</td>
              </tr>
            </tbody>
          ) : (
            <DataTableSkeleton
              columnCount={columns.length}
              rowCount={Math.max(1, pagination.pageSize)}
              aria-live="polite"
              aria-busy={true}
            />
          )
        ) : isError ? (
          <tbody aria-live="polite">
            <tr>
              <td colSpan={columns.length}>
                {errorState ?? defaultErrorState}
              </td>
            </tr>
          </tbody>
        ) : data.length === 0 ? (
          <tbody aria-live="polite">
            <tr>
              <td colSpan={columns.length}>
                {emptyState ?? defaultEmptyState}
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody className="divide-y divide-neutral-100" aria-live="polite">
            {table.getRowModel().rows.map((row) => {
              const isSelected = selectedRowId === row.id;
              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onRowClick(row.original);
                    }
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  className={cn(
                    onRowClick &&
                      'cursor-pointer focus:ring-2 focus:ring-brand-500 focus:outline-none focus:ring-inset',
                    isSelected
                      ? 'bg-brand-50 hover:bg-brand-100'
                      : 'hover:bg-neutral-50'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5">
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

      {/* Pagination - hidden during loading/error states */}
      {totalRows > 0 && !isLoading && !isError && (
        <DataTablePagination
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          pageCount={pageCount}
          totalRows={totalRows}
          pageSizeOptions={pageSizeOptions}
          onPageChange={(pageIndex) => table.setPageIndex(pageIndex)}
          onPageSizeChange={(pageSize) => {
            table.setPageSize(pageSize);
            table.setPageIndex(0);
          }}
        />
      )}
    </div>
  );
}

export type { DataTableProps };
