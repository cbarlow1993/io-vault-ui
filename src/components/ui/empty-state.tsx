/**
 * EmptyState component for displaying empty state messages.
 *
 * Use when there is no data to display in a section.
 */

import type { ReactNode } from 'react';

import { cn } from '@/lib/tailwind/utils';

export type EmptyStateProps = {
  /** Icon to display above the title */
  icon?: ReactNode;
  /** Main title text */
  title: string;
  /** Optional description text below the title */
  description?: string;
  /** Optional action element (e.g., button) */
  action?: ReactNode;
  /** Container className for custom sizing/padding */
  className?: string;
};

/**
 * EmptyState component for displaying empty state messages.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<WalletIcon className="size-8" />}
 *   title="No addresses yet"
 *   description="Create an address to start receiving funds"
 * />
 * ```
 *
 * @example
 * With action button:
 * ```tsx
 * <EmptyState
 *   icon={<UsersIcon className="size-10" />}
 *   title="No teams yet"
 *   description="Create a team to organize your members"
 *   action={<Button onClick={() => {}}>Create Team</Button>}
 * />
 * ```
 */
export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => {
  return (
    <div className={cn('px-4 py-8 text-center', className)}>
      {icon && (
        <div className="mx-auto text-neutral-300 [&>svg]:mx-auto [&>svg]:size-8">
          {icon}
        </div>
      )}
      <p className={cn('text-sm text-neutral-500', icon && 'mt-2')}>{title}</p>
      {description && (
        <p className="mt-1 text-xs text-neutral-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
