---
name: tanstack-patterns
description: Use when implementing data fetching with TanStack React Query, file-based routing with TanStack Router, or table features with TanStack Table
---

# TanStack Patterns

## Overview

Patterns for TanStack React Query (data fetching), TanStack Router (file-based routing), and TanStack Table (data tables) in React applications.

## React Query Patterns

### Basic Query

```typescript
import { orpc } from '@/lib/orpc/client';

function ResourceList() {
  const { data, isLoading, error } = orpc.resources.list.useQuery({
    input: { page: 1, limit: 20 },
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <List items={data.items} />;
}
```

### Query with Dependencies

```typescript
function ResourceDetail({ id }: { id: string }) {
  // Only fetch when id is available
  const { data } = orpc.resources.get.useQuery({
    input: { id },
    enabled: !!id,
  });
}
```

### Mutations with Optimistic Updates

```typescript
function CreateResource() {
  const queryClient = useQueryClient();

  const mutation = orpc.resources.create.useMutation({
    onMutate: async (newResource) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['resources'] });

      // Snapshot previous value
      const previous = queryClient.getQueryData(['resources']);

      // Optimistically update
      queryClient.setQueryData(['resources'], (old) => ({
        ...old,
        items: [...old.items, { ...newResource, id: 'temp' }],
      }));

      return { previous };
    },
    onError: (err, newResource, context) => {
      // Rollback on error
      queryClient.setQueryData(['resources'], context.previous);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}
```

### Prefetching

```typescript
// In parent component or route loader
const queryClient = useQueryClient();

await queryClient.prefetchQuery({
  queryKey: orpc.resources.list.getQueryKey({ input: { page: 1 } }),
  queryFn: () => orpc.resources.list.fetch({ input: { page: 1 } }),
});
```

## TanStack Router Patterns

### File-Based Route Structure

```
src/routes/
├── __root.tsx          # Root layout
├── _app.tsx            # App layout (auth wrapper)
├── _app/
│   ├── index.tsx       # /app
│   ├── resources/
│   │   ├── index.tsx   # /app/resources
│   │   └── $id.tsx     # /app/resources/:id
│   └── settings.tsx    # /app/settings
└── auth/
    └── login.tsx       # /auth/login
```

### Route with Loader

```typescript
// src/routes/_app/resources/$id.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/resources/$id')({
  loader: async ({ params, context }) => {
    return context.queryClient.ensureQueryData({
      queryKey: orpc.resources.get.getQueryKey({ input: { id: params.id } }),
      queryFn: () => orpc.resources.get.fetch({ input: { id: params.id } }),
    });
  },
  component: ResourceDetailPage,
});

function ResourceDetailPage() {
  const { id } = Route.useParams();
  const data = Route.useLoaderData();
  // data is typed and available immediately
}
```

### Search Params

```typescript
import { z } from 'zod';

const searchSchema = z.object({
  page: z.number().optional().default(1),
  search: z.string().optional(),
});

export const Route = createFileRoute('/_app/resources/')({
  validateSearch: searchSchema,
  component: ResourceListPage,
});

function ResourceListPage() {
  const { page, search } = Route.useSearch();
  const navigate = Route.useNavigate();

  // Update search params
  const handlePageChange = (newPage: number) => {
    navigate({ search: { page: newPage, search } });
  };
}
```

## TanStack Table Patterns

### Basic Table Setup

```typescript
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';

function DataTable<T>({ data, columns }: { data: T[], columns: ColumnDef<T>[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className="interactive-row">
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Column Definitions

```typescript
const columns: ColumnDef<Resource>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: 'actions',
    cell: ({ row }) => <RowActions resource={row.original} />,
  },
];
```

## Quick Reference

| Pattern | Use For |
|---------|---------|
| `useQuery` | Read operations |
| `useMutation` | Write operations |
| `invalidateQueries` | Refresh after mutation |
| `ensureQueryData` | Route loaders |
| `useSearch` | URL search params |
| `useParams` | URL path params |

## Common Mistakes

1. **Missing error boundaries** - Wrap query components in ErrorBoundary
2. **Over-fetching** - Use `staleTime` to prevent unnecessary refetches
3. **Missing loading states** - Always handle `isLoading`
4. **Not invalidating** - Invalidate queries after mutations
