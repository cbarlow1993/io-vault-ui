/**
 * LoadingState component for displaying loading indicators.
 *
 * Use when data is being fetched or processed.
 */

import { LoaderIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

export type LoadingStateProps = {
  /** Loading message to display */
  message?: string;
  /** Container className for custom sizing/padding */
  className?: string;
};

/**
 * LoadingState component for displaying loading indicators.
 *
 * @example
 * ```tsx
 * <LoadingState message="Loading vault details..." />
 * ```
 *
 * @example
 * Default message:
 * ```tsx
 * <LoadingState />
 * ```
 */
export const LoadingState = ({
  message = 'Loading...',
  className,
}: LoadingStateProps) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-8 text-neutral-500',
        className
      )}
    >
      <LoaderIcon className="size-4 animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  );
};
