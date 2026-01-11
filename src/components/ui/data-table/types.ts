import type {
  ColumnDef,
  PaginationState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';

export type { ColumnDef } from '@tanstack/react-table';

export interface DataTableProps<TData> {
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

export interface DataTableToolbarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  // Table instance passed internally
  table?: unknown;
}

export interface DataTablePaginationProps {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalRows: number;
  pageSizeOptions: number[];
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
}

export interface DataTableColumnHeaderProps<TData, TValue> {
  column: import('@tanstack/react-table').Column<TData, TValue>;
  title: string;
  className?: string;
}
