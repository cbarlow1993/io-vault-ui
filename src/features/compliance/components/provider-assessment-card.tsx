import {
  type ProviderAssessment,
  PROVIDER_LABELS,
} from '@/features/compliance';

import { RiskBadge } from './risk-badge';

interface ProviderAssessmentCardProps {
  assessment: ProviderAssessment;
}

export const ProviderAssessmentCard = ({
  assessment,
}: ProviderAssessmentCardProps) => {
  return (
    <div className="bg-white p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-neutral-900">
          {PROVIDER_LABELS[assessment.provider]}
        </h4>
        <RiskBadge level={assessment.riskLevel} />
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-xl font-bold text-neutral-900 tabular-nums">
          {assessment.riskScore}
        </span>
        <span className="text-[10px] text-neutral-500">/ 100</span>
      </div>

      {assessment.categories.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
            Risk Categories
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {assessment.categories.map((category) => (
              <span
                key={category}
                className="bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      )}

      {assessment.flags.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
            Flags
          </div>
          <div className="mt-1 space-y-0.5">
            {assessment.flags.map((flag) => (
              <div key={flag} className="text-[10px] text-negative-600">
                • {flag}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 text-[10px] text-neutral-400 tabular-nums">
        Last checked: {assessment.lastChecked.toLocaleString()}
      </div>
    </div>
  );
};
