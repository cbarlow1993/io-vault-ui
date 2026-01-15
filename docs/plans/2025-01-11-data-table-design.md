# DataTable Component Design

## Overview

A reusable table component built on TanStack Table v8 that provides:
- Server-side pagination with React Query integration
- Column sorting and visibility toggles
- Single row selection
- Consistent styling matching existing treasury-6-demo patterns
- Slots pattern for loading/empty/error states

## Architecture

### Components

**1. `DataTable<TData>` - Core component**
Generic wrapper around TanStack Table v8 that handles:
- Column definitions with sorting
- Row selection (single)
- Column visibility state
- Server-side pagination state

**2. `DataTablePagination` - Pagination controls**
- Page navigation (first/prev/next/last)
- Page size selector (10, 25, 50)
- "Showing X-Y of Z" display
- Controlled via TanStack Table's pagination state

**3. `DataTableToolbar` - Filter bar layout**
Container component providing consistent layout:
- Left side: search input + filter children (passed in)
- Right side: column visibility dropdown + optional actions
- Handles "Clear filters" button logic

**4. `DataTableColumnHeader` - Sortable header**
Helper component rendering column title with sort indicators.

### Usage Pattern

```tsx
const [pagination, setPagination] = useState<PaginationState>({
  pageIndex: 0,
  pageSize: 10,
});

const { data, isLoading, isError, refetch } = useQuery({
  queryKey: ['signers', pagination, filters],
  queryFn: () => fetchSigners({
    offset: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
    ...filters,
  }),
});

<DataTable
  columns={columns}
  data={data?.items ?? []}
  rowCount={data?.total}
  pagination={pagination}
  onPaginationChange={setPagination}
  isLoading={isLoading}
  isError={isError}
  onRetry={refetch}
  onRowClick={(row) => navigate(`/signers/${row.id}`)}
>
  <DataTableToolbar
    searchPlaceholder="Search signers..."
    searchValue={search}
    onSearchChange={setSearch}
    hasActiveFilters={hasFilters}
    onClearFilters={clearFilters}
    actions={<Button size="sm">+ Add Signer</Button>}
  >
    <FilterSelect label="Status" ... />
    <FilterSelect label="Type" ... />
  </DataTableToolbar>
</DataTable>
```

## Column Definition API

**Basic column:**
```tsx
const columns: ColumnDef<Signer>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <span className="font-medium text-neutral-900">
        {row.getValue('name')}
      </span>
    ),
  },
]
```

**Sortable column:**
```tsx
{
  accessorKey: 'createdAt',
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Created" />
  ),
  enableSorting: true,
}
```

**Column visibility:**
- All columns visible by default
- Set `enableHiding: false` to prevent hiding
- Visibility state managed via `columnVisibility` prop or internal state

**Special columns:**
- Selection column auto-injected when `enableRowSelection` is true
- Actions column pattern: `id: 'actions'`, no header

## Pagination

**State shape:**
```tsx
type PaginationState = {
  pageIndex: number;  // 0-based
  pageSize: number;   // 10, 25, 50
}
```

**Server-side pagination:**
- `rowCount` prop required for total item count
- Changing filters should reset `pageIndex` to 0 in parent
- Page size changes reset to page 0

**Client-side fallback:**
If `rowCount` is omitted, component uses `data.length` and handles pagination internally.

## Loading, Empty & Error States

**Props:**
```tsx
<DataTable
  isLoading={isLoading}
  isError={isError}
  onRetry={refetch}
  // Optional overrides
  loadingState={<CustomSkeleton />}
  emptyState={<CustomEmpty />}
  errorState={<CustomError />}
/>
```

**Default behaviors:**
- Loading: Skeleton rows matching pageSize, header visible, pagination disabled
- Empty: Centered message "No results found" with hint text
- Error: Error message with "Try again" button

**State priority:** Error > Loading > Empty > Table rows

## Toolbar Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Search...] [Filter] [Filter]      │  [Columns] [+ Action]  │
└─────────────────────────────────────────────────────────────┘
```

**DataTableToolbar props:**
- `searchPlaceholder` - Search input placeholder
- `searchValue` / `onSearchChange` - Controlled search
- `hasActiveFilters` - Shows clear button when true
- `onClearFilters` - Callback to reset filters
- `actions` - Optional right-side action buttons
- `children` - Filter components (FilterSelect, etc.)

## File Structure

```
src/components/ui/data-table/
├── index.ts                        # Public exports
├── data-table.tsx                  # Main DataTable component
├── data-table-pagination.tsx       # Pagination controls
├── data-table-toolbar.tsx          # Filter bar layout
├── data-table-column-header.tsx    # Sortable column header
├── data-table-skeleton.tsx         # Loading skeleton rows
└── data-table-column-visibility.tsx # Column toggle dropdown
```

## Public API

```tsx
export { DataTable } from './data-table';
export { DataTableToolbar } from './data-table-toolbar';
export { DataTableColumnHeader } from './data-table-column-header';
export type { DataTableProps, ColumnDef } from './data-table';
```

## Dependencies

```bash
pnpm add @tanstack/react-table
```

## Styling

Uses existing Tailwind patterns from treasury-6-demo:
- Container: `border border-neutral-200 bg-white`
- Headers: `border-b border-neutral-100 bg-neutral-50 text-left`
- Cells: `px-3 py-2` padding
- Rows: `divide-y divide-neutral-100` with `hover:bg-neutral-50`
- Text: `text-xs` for all table content
- Selected row: `bg-neutral-50` background

## Migration Path

After implementation, migrate existing tables:
1. page-signers.tsx (most complex, good first candidate)
2. page-whitelists.tsx
3. page-transaction-policies.tsx
4. Other list pages

Each migration removes ~50-100 lines of inline table/pagination code.
