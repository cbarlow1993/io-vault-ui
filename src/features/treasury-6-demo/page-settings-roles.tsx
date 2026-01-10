import { CheckIcon, XIcon, InfoIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { SettingsLayout } from './components/settings-layout';
import {
  roles,
  permissions,
  roleHasPermission,
  type Permission,
} from './data/settings';

// Group permissions by category for display
const permissionCategories = [
  {
    name: 'Organization',
    permissions: permissions.filter((p) => p.category === 'organization'),
  },
  {
    name: 'Workspaces',
    permissions: permissions.filter((p) => p.category === 'workspaces'),
  },
  {
    name: 'Vaults',
    permissions: permissions.filter((p) => p.category === 'vaults'),
  },
  {
    name: 'Addresses',
    permissions: permissions.filter((p) => p.category === 'addresses'),
  },
  {
    name: 'Operations',
    permissions: permissions.filter((p) => p.category === 'operations'),
  },
  {
    name: 'Identities',
    permissions: permissions.filter((p) => p.category === 'identities'),
  },
];

const PermissionCell = ({
  hasPermission,
  isHeader = false,
}: {
  hasPermission: boolean;
  isHeader?: boolean;
}) => {
  if (isHeader) return null;

  return (
    <div className="flex items-center justify-center">
      {hasPermission ? (
        <div className="bg-green-100 flex size-5 items-center justify-center">
          <CheckIcon className="text-green-600 size-3" strokeWidth={2.5} />
        </div>
      ) : (
        <div className="flex size-5 items-center justify-center bg-neutral-100">
          <XIcon className="size-3 text-neutral-400" strokeWidth={2.5} />
        </div>
      )}
    </div>
  );
};

const PermissionRow = ({ permission }: { permission: Permission }) => {
  return (
    <tr className="border-b border-neutral-100 last:border-b-0">
      <td className="py-3 pr-4 pl-4 text-sm text-neutral-700">
        {permission.name}
      </td>
      {roles.map((role) => (
        <td key={role.id} className="px-4 py-3 text-center">
          <PermissionCell
            hasPermission={roleHasPermission(role.id, permission.id)}
          />
        </td>
      ))}
    </tr>
  );
};

export const PageSettingsRoles = () => {
  return (
    <SettingsLayout
      title="Roles"
      description="View role definitions and their associated permissions"
    >
      {/* Role Cards */}
      <div className="mb-8 grid grid-cols-5 gap-4">
        {roles.map((role) => (
          <div key={role.id} className="border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-neutral-900">
              {role.name}
            </h3>
            <p className="mt-1 text-xs text-neutral-500">{role.description}</p>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="border-blue-200 bg-blue-50 mb-6 flex items-start gap-3 border p-4">
        <InfoIcon className="text-blue-600 size-5 shrink-0" strokeWidth={1.5} />
        <div>
          <p className="text-blue-900 text-sm font-medium">Predefined Roles</p>
          <p className="text-blue-700 mt-1 text-sm">
            Roles are predefined and cannot be modified. Assign roles to members
            when inviting them or through the Members page. Each workspace can
            have different role assignments for the same member.
          </p>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-900">
            Permission Matrix
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="py-3 pr-4 pl-4 text-left text-xs font-medium tracking-wider text-neutral-500 uppercase">
                  Permission
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className={cn(
                      'px-4 py-3 text-center text-xs font-medium tracking-wider text-neutral-500 uppercase',
                      'min-w-[100px]'
                    )}
                  >
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionCategories.map((category) => (
                <>
                  {/* Category Header */}
                  <tr key={category.name} className="bg-neutral-50">
                    <td
                      colSpan={roles.length + 1}
                      className="py-2 pl-4 text-xs font-semibold tracking-wider text-neutral-600 uppercase"
                    >
                      {category.name}
                    </td>
                  </tr>
                  {/* Category Permissions */}
                  {category.permissions.map((permission) => (
                    <PermissionRow
                      key={permission.id}
                      permission={permission}
                    />
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-sm text-neutral-500">
        <div className="flex items-center gap-2">
          <div className="bg-green-100 flex size-5 items-center justify-center">
            <CheckIcon className="text-green-600 size-3" strokeWidth={2.5} />
          </div>
          <span>Has permission</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center bg-neutral-100">
            <XIcon className="size-3 text-neutral-400" strokeWidth={2.5} />
          </div>
          <span>No permission</span>
        </div>
      </div>
    </SettingsLayout>
  );
};
