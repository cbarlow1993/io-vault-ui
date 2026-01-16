import { useMemo } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { ModuleRoleDropdown } from './module-role-dropdown';
import type { Module, ModuleRole } from '../schema';

type Member = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  globalRole: string;
  status: 'active' | 'pending';
  moduleAssignments: Record<string, string>; // moduleId -> role
};

type ModuleAccessTableProps = {
  members: Member[];
  modules: Module[];
  moduleRoles: Record<string, ModuleRole[]>; // moduleId -> roles
  loadingCell: { userId: string; moduleId: string } | null;
  onAssignRole: (userId: string, moduleId: string, role: string | null) => void;
};

export function ModuleAccessTable({
  members,
  modules,
  moduleRoles,
  loadingCell,
  onAssignRole,
}: ModuleAccessTableProps) {
  const assignableModules = useMemo(
    () => modules.filter((m) => m.id !== 'global'),
    [modules]
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs font-medium text-neutral-500">
            <th className="pr-4 pb-3">User</th>
            <th className="pr-4 pb-3">Global Role</th>
            {assignableModules.map((module) => (
              <th key={module.id} className="pr-4 pb-3">
                {module.display_name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              key={member.id}
              className={cn(
                'border-b border-neutral-100',
                member.status === 'pending' && 'opacity-60'
              )}
            >
              <td className="py-3 pr-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900">
                      {member.name}
                      {member.status === 'pending' && (
                        <span className="bg-amber-100 text-amber-700 ml-2 rounded px-1.5 py-0.5 text-xs">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {member.email}
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-3 pr-4">
                <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium capitalize">
                  {member.globalRole}
                </span>
              </td>
              {assignableModules.map((module) => {
                const currentRole = member.moduleAssignments[module.id] ?? null;
                const roles = moduleRoles[module.id] ?? [];
                const isLoading =
                  loadingCell?.userId === member.id &&
                  loadingCell?.moduleId === module.id;

                return (
                  <td key={module.id} className="py-3 pr-4">
                    <ModuleRoleDropdown
                      currentRole={currentRole}
                      roles={roles}
                      isLoading={isLoading}
                      onSelectRole={(role) =>
                        onAssignRole(member.id, module.id, role)
                      }
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
