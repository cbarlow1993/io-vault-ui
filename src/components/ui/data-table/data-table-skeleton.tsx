import { Skeleton } from '@/components/ui/skeleton';

interface DataTableSkeletonProps {
  columnCount: number;
  rowCount?: number;
}

export function DataTableSkeleton({
  columnCount,
  rowCount = 10,
}: DataTableSkeletonProps) {
  return (
    <tbody className="divide-y divide-neutral-100">
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <td key={colIndex} className="px-3 py-2.5">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
