import type { Table } from '@tanstack/react-table';
import { SlidersHorizontalIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DataTableColumnVisibilityProps<TData> {
  table: Table<TData>;
}

export function DataTableColumnVisibility<TData>({
  table,
}: DataTableColumnVisibilityProps<TData>) {
  const columns = table.getAllColumns().filter((column) => column.getCanHide());

  if (columns.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hover-medium flex h-7 items-center gap-1.5 border-input px-2 text-xs text-neutral-600"
        >
          <SlidersHorizontalIcon className="size-3.5" />
          <span>Columns</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-none">
        <DropdownMenuLabel className="text-xs font-medium">
          Toggle columns
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => {
          const header = column.columnDef.header;
          // Convert camelCase to Title Case with spaces
          const humanizeColumnId = (id: string) =>
            id
              .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before uppercase letters
              .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
          const columnName =
            typeof header === 'string' ? header : humanizeColumnId(column.id);

          return (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
              className="cursor-pointer rounded-none text-xs"
            >
              {columnName}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
