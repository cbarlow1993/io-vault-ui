/**
 * Status icon helpers for consistent status icon display across the application.
 *
 * Provides appropriate icons for common status types.
 */

import { CheckCircleIcon, ClockIcon, XCircleIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/tailwind/utils';

/**
 * Status categories for icon selection.
 */
export type StatusIconType = 'positive' | 'warning' | 'negative';

/**
 * Common status values that map to icons.
 */
export type IconableStatus =
  // Positive statuses
  | 'completed'
  | 'success'
  | 'approved'
  | 'active'
  | 'verified'
  | 'paid'
  // Warning statuses
  | 'pending'
  | 'voting'
  | 'presigning'
  | 'signing'
  // Negative statuses
  | 'failed'
  | 'rejected'
  | 'expired'
  | 'failure'
  | 'revoked';

/**
 * Get the icon type (positive/warning/negative) for a status.
 *
 * @param status - Status string
 * @returns The icon type category
 */
export const getStatusIconType = (status: string): StatusIconType => {
  switch (status) {
    // Positive statuses
    case 'completed':
    case 'success':
    case 'approved':
    case 'active':
    case 'verified':
    case 'paid':
      return 'positive';

    // Warning statuses
    case 'pending':
    case 'voting':
    case 'presigning':
    case 'signing':
      return 'warning';

    // Negative statuses
    case 'failed':
    case 'rejected':
    case 'expired':
    case 'failure':
    case 'revoked':
      return 'negative';

    // Default to warning for unknown statuses
    default:
      return 'warning';
  }
};

const iconTypeStyles: Record<StatusIconType, string> = {
  positive: 'text-positive-600',
  warning: 'text-warning-600',
  negative: 'text-negative-600',
};

/**
 * Get a status icon based on the status type.
 *
 * @param status - Status string (completed, pending, failed, etc.)
 * @param options - Optional className for custom styling
 * @returns React node with the appropriate icon
 *
 * @example
 * ```tsx
 * <>{getStatusIcon('completed')}</>
 * <>{getStatusIcon('pending', { className: 'size-5' })}</>
 * ```
 */
export const getStatusIcon = (
  status: string,
  options?: { className?: string }
): ReactNode => {
  const iconType = getStatusIconType(status);
  const baseClassName = cn(
    'size-4',
    iconTypeStyles[iconType],
    options?.className
  );

  switch (iconType) {
    case 'positive':
      return <CheckCircleIcon className={baseClassName} />;
    case 'warning':
      return <ClockIcon className={baseClassName} />;
    case 'negative':
      return <XCircleIcon className={baseClassName} />;
  }
};

/**
 * Get a status icon by explicit type (positive/warning/negative).
 *
 * @param type - Icon type (positive, warning, negative)
 * @param options - Optional className for custom styling
 * @returns React node with the appropriate icon
 *
 * @example
 * ```tsx
 * <>{getStatusIconByType('positive')}</>
 * ```
 */
export const getStatusIconByType = (
  type: StatusIconType,
  options?: { className?: string }
): ReactNode => {
  const baseClassName = cn('size-4', iconTypeStyles[type], options?.className);

  switch (type) {
    case 'positive':
      return <CheckCircleIcon className={baseClassName} />;
    case 'warning':
      return <ClockIcon className={baseClassName} />;
    case 'negative':
      return <XCircleIcon className={baseClassName} />;
  }
};
