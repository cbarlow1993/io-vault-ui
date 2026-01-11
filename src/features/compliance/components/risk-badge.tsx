import { cn } from '@/lib/tailwind/utils';

import { type RiskLevel, RISK_LEVEL_LABELS } from '@/features/compliance';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

const riskStyles: Record<RiskLevel, string> = {
  low: 'bg-positive-100 text-positive-700',
  medium: 'bg-warning-100 text-warning-700',
  high: 'bg-negative-100 text-negative-700',
  severe: 'bg-negative-200 text-negative-800',
};

export const RiskBadge = ({ level, className }: RiskBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
        riskStyles[level],
        className
      )}
    >
      {RISK_LEVEL_LABELS[level]}
    </span>
  );
};
