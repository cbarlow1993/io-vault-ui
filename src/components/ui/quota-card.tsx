import { cn } from '@/lib/tailwind/utils';

import { Skeleton } from './skeleton';

export interface QuotaCardProps {
  /** The feature/resource name displayed prominently at the top */
  label: string;
  /** Current usage count */
  used: number;
  /** Maximum limit. Use null or -1 for unlimited */
  limit: number | null;
  /** Optional unit label (e.g., "/ month") */
  unit?: string;
  /** Additional class names for the container */
  className?: string;
}

export const QuotaCard = ({
  label,
  used,
  limit,
  unit,
  className,
}: QuotaCardProps) => {
  const isUnlimited = limit === null || limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  return (
    <div
      className={cn('border border-neutral-100 bg-neutral-50 p-4', className)}
    >
      <p className="text-sm font-semibold text-neutral-900">{label}</p>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-neutral-900 tabular-nums">
          {used.toLocaleString()}
        </span>
        <span className="text-sm text-neutral-500">
          {isUnlimited ? (
            '/ ∞'
          ) : (
            <>
              / {limit.toLocaleString()}
              {unit ? ` ${unit}` : ''}
            </>
          )}
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden bg-neutral-200">
        <div
          className={cn(
            'h-full transition-all',
            isAtLimit
              ? 'bg-negative-500'
              : isNearLimit
                ? 'bg-warning-500'
                : 'bg-brand-500'
          )}
          style={{ width: isUnlimited ? '0%' : `${percentage}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="mt-2 text-xs text-negative-600">Limit reached</p>
      )}
    </div>
  );
};

export const QuotaCardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn('border border-neutral-100 bg-neutral-50 p-4', className)}>
    <Skeleton className="h-4 w-20" />
    <div className="mt-3 flex items-baseline gap-1">
      <Skeleton className="h-7 w-12" />
      <Skeleton className="h-4 w-16" />
    </div>
    <Skeleton className="mt-3 h-1.5 w-full" />
  </div>
);
