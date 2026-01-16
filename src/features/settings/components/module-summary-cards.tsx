import { cn } from '@/lib/tailwind/utils';

import type { Module } from '../schema';

type ModuleSummaryCardsProps = {
  modules: Module[];
  userCounts: Record<string, number>;
  roleCounts: Record<string, number>;
  selectedModule: string | null;
  onSelectModule: (moduleId: string | null) => void;
};

export function ModuleSummaryCards({
  modules,
  userCounts,
  roleCounts,
  selectedModule,
  onSelectModule,
}: ModuleSummaryCardsProps) {
  return (
    <div className="mb-6 grid grid-cols-3 gap-4">
      {modules.map((module) => {
        const isSelected = selectedModule === module.id;
        return (
          <button
            key={module.id}
            type="button"
            onClick={() => onSelectModule(isSelected ? null : module.id)}
            className={cn(
              'rounded-lg border-card p-4 text-left transition-all',
              isSelected && 'ring-2 ring-neutral-900',
              'hover-medium'
            )}
          >
            <h3 className="font-medium text-neutral-900">
              {module.display_name}
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              {userCounts[module.id] ?? 0} users
            </p>
            <p className="text-sm text-neutral-500">
              {roleCounts[module.id] ?? 0} roles
            </p>
          </button>
        );
      })}
    </div>
  );
}
