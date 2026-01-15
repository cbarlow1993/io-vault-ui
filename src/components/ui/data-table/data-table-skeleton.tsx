import { Skeleton } from '@/components/ui/skeleton';

interface DataTableSkeletonProps {
  columnCount: number;
  rowCount?: number;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-busy'?: boolean;
}

export function DataTableSkeleton({
  columnCount,
  rowCount = 10,
  'aria-live': ariaLive,
  'aria-busy': ariaBusy,
}: DataTableSkeletonProps) {
  return (
    <tbody
      className="divide-y divide-neutral-100"
      aria-live={ariaLive}
      aria-busy={ariaBusy}
    >
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
