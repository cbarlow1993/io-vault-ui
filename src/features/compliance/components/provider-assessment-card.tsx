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
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-neutral-900">
          {PROVIDER_LABELS[assessment.provider]}
        </h4>
        <RiskBadge level={assessment.riskLevel} />
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-neutral-900">
          {assessment.riskScore}
        </span>
        <span className="text-sm text-neutral-500">/ 100</span>
      </div>

      {assessment.categories.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium text-neutral-500">
            Risk Categories
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {assessment.categories.map((category) => (
              <span
                key={category}
                className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      )}

      {assessment.flags.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium text-neutral-500">Flags</div>
          <div className="mt-1 space-y-1">
            {assessment.flags.map((flag) => (
              <div key={flag} className="text-xs text-negative-600">
                • {flag}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-neutral-400">
        Last checked: {assessment.lastChecked.toLocaleString()}
      </div>
    </div>
  );
};
