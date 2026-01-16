import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import type { ModuleRole } from '../schema';

type ModuleRoleDropdownProps = {
  currentRole: string | null;
  roles: ModuleRole[];
  isLoading?: boolean;
  onSelectRole: (role: string | null) => void;
};

export function ModuleRoleDropdown({
  currentRole,
  roles,
  isLoading,
  onSelectRole,
}: ModuleRoleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentRoleDisplay = currentRole
    ? (roles.find((r) => r.name === currentRole)?.display_name ?? currentRole)
    : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          'flex h-8 min-w-[120px] items-center justify-between gap-2 rounded px-2 text-xs',
          currentRole ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-400',
          'hover-medium',
          isLoading && 'opacity-50'
        )}
      >
        <span>{currentRoleDisplay ?? '—'}</span>
        <ChevronDownIcon className="size-3" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 z-20 mt-1 w-48 rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                onSelectRole(null);
                setIsOpen(false);
              }}
              className="hover-subtle flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-600"
            >
              {currentRole === null && <CheckIcon className="size-4" />}
              {currentRole !== null && <span className="size-4" />}
              No Access
            </button>
            <div className="my-1 border-t border-neutral-200" />
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => {
                  onSelectRole(role.name);
                  setIsOpen(false);
                }}
                className="hover-subtle flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-900"
              >
                {currentRole === role.name && <CheckIcon className="size-4" />}
                {currentRole !== role.name && <span className="size-4" />}
                {role.display_name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
