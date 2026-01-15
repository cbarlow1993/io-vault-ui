/**
 * StatusBadge component for displaying status labels with consistent styling.
 *
 * Uses the shared status styles from status-styles.ts.
 */

import type { ReactNode } from 'react';

import { cn } from '@/lib/tailwind/utils';

import {
  getStatusStyles,
  type CommonStatus,
} from '@/features/shared/lib/status-styles';

export type StatusBadgeProps = {
  /** Status value to display */
  status: string;
  /** Optional custom label (defaults to capitalized status) */
  label?: string;
  /** Optional icon to display before the label */
  icon?: ReactNode;
  /** Additional className for custom styling */
  className?: string;
  /** Whether to capitalize the label */
  capitalize?: boolean;
};

/**
 * StatusBadge component for displaying status labels with consistent styling.
 *
 * @example
 * ```tsx
 * <StatusBadge status="active" />
 * ```
 *
 * @example
 * With custom label:
 * ```tsx
 * <StatusBadge status="pending" label="Awaiting Approval" />
 * ```
 *
 * @example
 * With icon:
 * ```tsx
 * <StatusBadge status="completed" icon={<CheckIcon className="size-3" />} />
 * ```
 */
export const StatusBadge = ({
  status,
  label,
  icon,
  className,
  capitalize = true,
}: StatusBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
        capitalize && 'capitalize',
        getStatusStyles(status),
        className
      )}
    >
      {icon}
      {label ?? status}
    </span>
  );
};
