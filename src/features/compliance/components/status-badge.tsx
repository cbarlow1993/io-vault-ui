import { cn } from '@/lib/tailwind/utils';

import {
  type TransactionStatus,
  TRANSACTION_STATUS_LABELS,
} from '@/features/compliance';

interface StatusBadgeProps {
  status: TransactionStatus;
  className?: string;
}

const statusStyles: Record<TransactionStatus, string> = {
  pending_l1: 'bg-warning-100 text-warning-700',
  under_l1_review: 'bg-brand-100 text-brand-700',
  pending_l2: 'bg-warning-100 text-warning-700',
  under_l2_review: 'bg-brand-100 text-brand-700',
  approved: 'bg-positive-100 text-positive-700',
  rejected: 'bg-negative-100 text-negative-700',
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium',
        statusStyles[status],
        className
      )}
    >
      {TRANSACTION_STATUS_LABELS[status]}
    </span>
  );
};
