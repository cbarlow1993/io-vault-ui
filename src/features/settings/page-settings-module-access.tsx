import { useOrganization } from '@clerk/tanstack-react-start';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { SearchIcon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';
import { cn } from '@/lib/tailwind/utils';

import { DataTable } from '@/components/ui/data-table';

import { ModuleSummaryCards } from './components/module-summary-cards';
import { SettingsLayout } from './components/settings-layout';
import {
  mapClerkRole,
  mapInvitation,
  mapMembership,
} from './lib/clerk-members';
import type { Module, ModuleRole, UserWithRoles } from './schema';

// Member type for the table
type ModuleAccessMember = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  globalRole: string;
  status: 'active' | 'pending';
  moduleAssignments: Record<string, string>; // moduleId -> role name
};

// Cell component for module role assignment
function ModuleRoleCell({
  member,
  moduleId,
  roles,
  currentRole,
  isLoading,
  onAssignRole,
}: {
  member: ModuleAccessMember;
  moduleId: string;
  roles: ModuleRole[];
  currentRole: string | null;
  isLoading: boolean;
  onAssignRole: (userId: string, moduleId: string, role: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const currentRoleDisplay = currentRole
    ? (roles.find((r) => r.name === currentRole)?.display_name ?? currentRole)
    : null;

  const handleSelect = (role: string | null) => {
    onAssignRole(member.id, moduleId, role);
    setIsOpen(false);
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          'flex h-7 min-w-[100px] items-center justify-between gap-2 px-2 text-xs',
          currentRole ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-400',
          'hover:bg-neutral-100',
          isLoading && 'opacity-50'
        )}
      >
        <span>{isLoading ? '...' : (currentRoleDisplay ?? '—')}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 z-20 mt-1 w-40 border border-neutral-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                'flex w-full items-center px-3 py-1.5 text-left text-xs',
                'hover:bg-neutral-50',
                currentRole === null && 'bg-neutral-50 font-medium'
              )}
            >
              No Access
            </button>
            <div className="my-1 border-t border-neutral-100" />
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => handleSelect(role.name)}
                className={cn(
                  'flex w-full items-center px-3 py-1.5 text-left text-xs',
                  'hover:bg-neutral-50',
                  currentRole === role.name && 'bg-neutral-50 font-medium'
                )}
              >
                {role.display_name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function PageSettingsModuleAccess() {
  const { memberships, invitations } = useOrganization({
    memberships: {
      infinite: true,
      keepPreviousData: true,
    },
    invitations: {
      infinite: true,
      keepPreviousData: true,
      status: ['pending'],
    },
  });

  // Auto-fetch all pages when component mounts
  useEffect(() => {
    if (memberships?.hasNextPage && !memberships?.isFetching) {
      memberships.fetchNext();
    }
  }, [memberships]);

  useEffect(() => {
    if (invitations?.hasNextPage && !invitations?.isFetching) {
      invitations.fetchNext();
    }
  }, [invitations]);

  // Fetch modules
  const { data: modulesData, isLoading: isLoadingModules } = useQuery(
    orpc.modules.list.queryOptions({})
  );

  // Fetch users with their module roles from Core API
  const {
    data: usersWithRolesData,
    isLoading: isLoadingUsersWithRoles,
    refetch: refetchUsersWithRoles,
  } = useQuery(orpc.modules.getUsersWithRoles.queryOptions({}));

  // Build a lookup map from user_id to their module roles
  const userRolesMap = useMemo(() => {
    const map = new Map<string, UserWithRoles>();
    for (const user of usersWithRolesData?.users ?? []) {
      map.set(user.user_id, user);
    }
    return map;
  }, [usersWithRolesData?.users]);

  // Wrap modules in useMemo to prevent dependency changes on every render
  const modules = useMemo<Module[]>(
    () => modulesData?.modules ?? [],
    [modulesData?.modules]
  );

  // Assignable modules (exclude global)
  const assignableModules = useMemo(
    () => modules.filter((m) => m.id !== 'global'),
    [modules]
  );

  // State for module roles (fetched on demand)
  const [moduleRoles, setModuleRoles] = useState<Record<string, ModuleRole[]>>(
    {}
  );

  // Fetch roles for each module when modules are loaded
  useEffect(() => {
    const fetchRoles = async () => {
      const rolesMap: Record<string, ModuleRole[]> = {};
      for (const module of modules) {
        if (module.id !== 'global') {
          try {
            const response = await orpc.modules.getRoles.call({
              moduleId: module.id,
            });
            rolesMap[module.id] = response.roles;
          } catch {
            rolesMap[module.id] = [];
          }
        }
      }
      setModuleRoles(rolesMap);
    };
    if (modules.length > 0) {
      fetchRoles();
    }
  }, [modules]);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [loadingCell, setLoadingCell] = useState<{
    userId: string;
    moduleId: string;
  } | null>(null);

  // Map Clerk members to our format, merging with Core API module roles
  const members = useMemo<ModuleAccessMember[]>(() => {
    const activeMembers = (memberships?.data ?? []).map((m) => {
      const mapped = mapMembership(m);
      const userRoles = userRolesMap.get(mapped.id);

      // Convert module_roles object to moduleAssignments format (moduleId -> role name)
      const moduleAssignments: Record<string, string> = {};
      if (userRoles?.module_roles) {
        for (const [moduleId, roleInfo] of Object.entries(
          userRoles.module_roles
        )) {
          moduleAssignments[moduleId] = roleInfo.role;
        }
      }

      return {
        id: mapped.id,
        name: mapped.name,
        email: mapped.email,
        avatarUrl: mapped.avatarUrl,
        globalRole: mapClerkRole(m.role),
        status: 'active' as const,
        moduleAssignments,
      };
    });

    const pendingMembers = (invitations?.data ?? []).map((inv) => {
      const mapped = mapInvitation(inv);
      return {
        id: mapped.id,
        name: mapped.name,
        email: mapped.email,
        globalRole: mapClerkRole(inv.role ?? 'org:member'),
        status: 'pending' as const,
        moduleAssignments: {} as Record<string, string>,
      };
    });

    return [...activeMembers, ...pendingMembers];
  }, [memberships?.data, invitations?.data, userRolesMap]);

  const isLoading =
    isLoadingModules ||
    isLoadingUsersWithRoles ||
    !memberships?.data ||
    memberships?.isFetching;

  // Filter members
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        !searchQuery ||
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesModule =
        !selectedModule || member.moduleAssignments[selectedModule];

      return matchesSearch && matchesModule;
    });
  }, [members, searchQuery, selectedModule]);

  // Mutations
  const { mutateAsync: assignRole } = useMutation(
    orpc.modules.assignRole.mutationOptions({
      onSuccess: () => {
        toast.success('Module access updated');
        refetchUsersWithRoles();
      },
      onError: () => {
        toast.error('Failed to update module access');
      },
    })
  );

  const { mutateAsync: removeRole } = useMutation(
    orpc.modules.removeRole.mutationOptions({
      onSuccess: () => {
        toast.success('Module access removed');
        refetchUsersWithRoles();
      },
      onError: () => {
        toast.error('Failed to remove module access');
      },
    })
  );

  // Handle role assignment
  const handleAssignRole = useCallback(
    async (userId: string, moduleId: string, role: string | null) => {
      setLoadingCell({ userId, moduleId });

      try {
        if (role === null) {
          await removeRole({ userId, moduleId });
        } else {
          await assignRole({ userId, moduleId, role });
        }
      } finally {
        setLoadingCell(null);
      }
    },
    [assignRole, removeRole]
  );

  // Calculate counts for summary cards
  const userCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const module of modules) {
      counts[module.id] = members.filter(
        (m) => m.moduleAssignments[module.id]
      ).length;
    }
    return counts;
  }, [modules, members]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const module of modules) {
      counts[module.id] = moduleRoles[module.id]?.length ?? 0;
    }
    return counts;
  }, [modules, moduleRoles]);

  // Define columns for DataTable
  const columns = useMemo<ColumnDef<ModuleAccessMember, unknown>[]>(() => {
    const baseColumns: ColumnDef<ModuleAccessMember, unknown>[] = [
      {
        accessorKey: 'name',
        header: 'User',
        cell: ({ row }) => {
          const member = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-900">
                    {member.name}
                  </span>
                  {member.status === 'pending' && (
                    <span className="bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 text-[10px]">
                      Pending
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-neutral-500">
                  {member.email}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'globalRole',
        header: 'Global Role',
        cell: ({ row }) => (
          <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium capitalize">
            {row.original.globalRole}
          </span>
        ),
      },
    ];

    // Add a column for each assignable module
    const moduleColumns: ColumnDef<ModuleAccessMember, unknown>[] =
      assignableModules.map((module) => ({
        id: `module_${module.id}`,
        header: module.display_name,
        cell: ({ row }) => {
          const member = row.original;
          const currentRole = member.moduleAssignments[module.id] ?? null;
          const roles = moduleRoles[module.id] ?? [];
          const isCellLoading =
            loadingCell?.userId === member.id &&
            loadingCell?.moduleId === module.id;

          return (
            <ModuleRoleCell
              member={member}
              moduleId={module.id}
              roles={roles}
              currentRole={currentRole}
              isLoading={isCellLoading}
              onAssignRole={handleAssignRole}
            />
          );
        },
      }));

    return [...baseColumns, ...moduleColumns];
  }, [assignableModules, moduleRoles, loadingCell, handleAssignRole]);

  return (
    <SettingsLayout
      title="Module Access"
      description="Manage user access to modules. Assign users to Treasury, Compliance, or Tokenisation with specific roles."
    >
      <div className="space-y-6">
        <ModuleSummaryCards
          modules={assignableModules}
          userCounts={userCounts}
          roleCounts={roleCounts}
          selectedModule={selectedModule}
          onSelectModule={setSelectedModule}
        />

        {/* Filter Bar */}
        <div className="flex items-center justify-between border border-neutral-200 bg-white px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <SearchIcon className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-48 border border-neutral-200 bg-neutral-50 pr-2 pl-7 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </div>

            {selectedModule && (
              <button
                type="button"
                onClick={() => setSelectedModule(null)}
                className="flex h-7 items-center gap-1 px-2 text-xs text-neutral-500 hover:text-neutral-900"
              >
                <XIcon className="size-3" />
                Clear filter
              </button>
            )}
          </div>

          <span className="text-xs text-neutral-500">
            {filteredMembers.length}{' '}
            {filteredMembers.length === 1 ? 'user' : 'users'}
          </span>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredMembers}
          getRowId={(row) => row.id}
          pageSizeOptions={[10, 25, 50]}
          isLoading={isLoading}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm font-medium text-neutral-900">
                No users found
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Try adjusting your search or filters
              </p>
            </div>
          }
        />

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span>
            {members.filter((m) => m.status === 'active').length} active
          </span>
          <span className="text-neutral-300">|</span>
          <span>
            {members.filter((m) => m.status === 'pending').length} pending
          </span>
        </div>
      </div>
    </SettingsLayout>
  );
}
