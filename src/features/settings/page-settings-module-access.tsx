import { useOrganization } from '@clerk/tanstack-react-start';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckIcon, SearchIcon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/ui/data-table';
import { orpc } from '@/lib/orpc/client';
import { cn } from '@/lib/tailwind/utils';

import { ModuleSummaryCards } from './components/module-summary-cards';
import { SettingsLayout } from './components/settings-layout';
import {
  mapClerkRole,
  mapInvitation,
  mapMembership,
} from './lib/clerk-members';
import type { Module, ModuleRole } from './schema';

// ============================================================================
// Types
// ============================================================================

type MemberRow = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  globalRole: string;
  status: 'active' | 'pending';
  moduleRoles: Record<string, string>; // moduleId -> role name
};

// ============================================================================
// Role Cell Component
// ============================================================================

function RoleCell({
  userId,
  moduleId,
  currentRole,
  availableRoles,
  isUpdating,
  onChangeRole,
}: {
  userId: string;
  moduleId: string;
  currentRole: string | null;
  availableRoles: ModuleRole[];
  isUpdating: boolean;
  onChangeRole: (userId: string, moduleId: string, role: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const displayName = currentRole
    ? (availableRoles.find((r) => r.name === currentRole)?.display_name ??
      currentRole)
    : null;

  const handleSelect = (role: string | null) => {
    if (role !== currentRole) {
      onChangeRole(userId, moduleId, role);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={cn(
          'flex h-7 min-w-[100px] items-center gap-2 px-2 text-xs',
          currentRole
            ? 'bg-neutral-100 text-neutral-900'
            : 'text-neutral-400 hover:bg-neutral-50',
          isUpdating && 'opacity-50'
        )}
      >
        {isUpdating ? '...' : (displayName ?? '—')}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 z-20 mt-1 w-44 border border-neutral-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs',
                'hover:bg-neutral-50',
                !currentRole && 'font-medium'
              )}
            >
              <span className="w-4">
                {!currentRole && <CheckIcon className="size-3" />}
              </span>
              No Access
            </button>
            <div className="my-1 border-t border-neutral-100" />
            {availableRoles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => handleSelect(role.name)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs',
                  'hover:bg-neutral-50',
                  currentRole === role.name && 'font-medium'
                )}
              >
                <span className="w-4">
                  {currentRole === role.name && (
                    <CheckIcon className="size-3" />
                  )}
                </span>
                {role.display_name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PageSettingsModuleAccess() {
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Clerk Data: Organization Members
  // ---------------------------------------------------------------------------

  const { memberships, invitations } = useOrganization({
    memberships: { infinite: true, keepPreviousData: true },
    invitations: {
      infinite: true,
      keepPreviousData: true,
      status: ['pending'],
    },
  });

  // Auto-fetch all pages
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

  const clerkUserIds = useMemo(() => {
    return (memberships?.data ?? [])
      .map((m) => m.publicUserData?.userId)
      .filter((id): id is string => !!id);
  }, [memberships?.data]);

  // ---------------------------------------------------------------------------
  // Core API Data: Modules
  // ---------------------------------------------------------------------------

  const { data: modulesData, isLoading: isLoadingModules } = useQuery(
    orpc.modules.list.queryOptions({})
  );

  const modules = useMemo<Module[]>(
    () => modulesData?.modules ?? [],
    [modulesData?.modules]
  );

  const assignableModules = useMemo(
    () => modules.filter((m) => m.name !== 'global'),
    [modules]
  );

  // ---------------------------------------------------------------------------
  // Core API Data: Module Roles (cached per module)
  // ---------------------------------------------------------------------------

  const [moduleRolesMap, setModuleRolesMap] = useState<
    Record<string, ModuleRole[]>
  >({});

  useEffect(() => {
    const fetchAllRoles = async () => {
      const rolesMap: Record<string, ModuleRole[]> = {};
      await Promise.all(
        assignableModules.map(async (module) => {
          try {
            const response = await orpc.modules.getRoles.call({
              moduleId: module.id,
            });
            rolesMap[module.id] = response.roles;
          } catch {
            rolesMap[module.id] = [];
          }
        })
      );
      setModuleRolesMap(rolesMap);
    };

    if (assignableModules.length > 0) {
      fetchAllRoles();
    }
  }, [assignableModules]);

  // ---------------------------------------------------------------------------
  // Core API Data: User Role Assignments
  // ---------------------------------------------------------------------------

  const { data: usersWithRolesData, isLoading: isLoadingRoles } = useQuery({
    ...orpc.modules.getUsersWithRoles.queryOptions({ userIds: clerkUserIds }),
    enabled: clerkUserIds.length > 0,
    placeholderData: keepPreviousData, // Prevent table reset during refetch
  });

  // Build lookup: user_id -> { moduleId -> roleName }
  const userRolesLookup = useMemo(() => {
    const lookup = new Map<string, Record<string, string>>();
    for (const user of usersWithRolesData?.users ?? []) {
      const roles: Record<string, string> = {};
      if (user.module_roles && typeof user.module_roles === 'object') {
        for (const [moduleId, roleInfo] of Object.entries(user.module_roles)) {
          roles[moduleId] = roleInfo.role;
        }
      }
      lookup.set(user.user_id, roles);
    }
    return lookup;
  }, [usersWithRolesData?.users]);

  // ---------------------------------------------------------------------------
  // Combined Data: Members with Roles
  // ---------------------------------------------------------------------------

  const members = useMemo<MemberRow[]>(() => {
    const activeMembers = (memberships?.data ?? []).map((m) => {
      const mapped = mapMembership(m);
      const moduleRoles = userRolesLookup.get(mapped.id) ?? {};

      return {
        id: mapped.id,
        name: mapped.name,
        email: mapped.email,
        avatarUrl: mapped.avatarUrl,
        globalRole: mapClerkRole(m.role),
        status: 'active' as const,
        moduleRoles,
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
        moduleRoles: {},
      };
    });

    return [...activeMembers, ...pendingMembers];
  }, [memberships?.data, invitations?.data, userRolesLookup]);

  // ---------------------------------------------------------------------------
  // UI State
  // ---------------------------------------------------------------------------

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [updatingCell, setUpdatingCell] = useState<string | null>(null); // "userId:moduleId"

  // ---------------------------------------------------------------------------
  // Filtered Data
  // ---------------------------------------------------------------------------

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !member.name.toLowerCase().includes(query) &&
          !member.email.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Module filter
      if (selectedModule && !member.moduleRoles[selectedModule]) {
        return false;
      }

      return true;
    });
  }, [members, searchQuery, selectedModule]);

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const queryKey = orpc.modules.getUsersWithRoles.queryOptions({
    userIds: clerkUserIds,
  }).queryKey;

  const { mutateAsync: assignRole } = useMutation(
    orpc.modules.assignRole.mutationOptions({
      onSuccess: async () => {
        toast.success('Role updated');
        await queryClient.invalidateQueries({ queryKey });
      },
      onError: () => {
        toast.error('Failed to update role');
      },
    })
  );

  const { mutateAsync: removeRole } = useMutation(
    orpc.modules.removeRole.mutationOptions({
      onSuccess: async () => {
        toast.success('Access removed');
        await queryClient.invalidateQueries({ queryKey });
      },
      onError: () => {
        toast.error('Failed to remove access');
      },
    })
  );

  const handleChangeRole = useCallback(
    async (userId: string, moduleId: string, role: string | null) => {
      const cellKey = `${userId}:${moduleId}`;
      setUpdatingCell(cellKey);

      try {
        if (role === null) {
          await removeRole({ userId, moduleId });
        } else {
          await assignRole({ userId, moduleId, role });
        }
      } finally {
        setUpdatingCell(null);
      }
    },
    [assignRole, removeRole]
  );

  // ---------------------------------------------------------------------------
  // Summary Card Data
  // ---------------------------------------------------------------------------

  const userCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const module of modules) {
      counts[module.id] = members.filter(
        (m) => m.moduleRoles[module.id]
      ).length;
    }
    return counts;
  }, [modules, members]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const module of modules) {
      counts[module.id] = moduleRolesMap[module.id]?.length ?? 0;
    }
    return counts;
  }, [modules, moduleRolesMap]);

  // ---------------------------------------------------------------------------
  // Table Columns
  // ---------------------------------------------------------------------------

  const columns = useMemo<ColumnDef<MemberRow>[]>(() => {
    const baseColumns: ColumnDef<MemberRow>[] = [
      {
        accessorKey: 'name',
        header: 'User',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium">
              {row.original.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-900">
                  {row.original.name}
                </span>
                {row.original.status === 'pending' && (
                  <span className="bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 text-[10px]">
                    Pending
                  </span>
                )}
              </div>
              <div className="text-[10px] text-neutral-500">
                {row.original.email}
              </div>
            </div>
          </div>
        ),
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

    const moduleColumns: ColumnDef<MemberRow>[] = assignableModules.map(
      (module) => ({
        id: `module_${module.id}`,
        header: module.display_name,
        cell: ({ row }) => {
          const member = row.original;
          const currentRole = member.moduleRoles[module.id] ?? null;
          const cellKey = `${member.id}:${module.id}`;

          return (
            <RoleCell
              userId={member.id}
              moduleId={module.id}
              currentRole={currentRole}
              availableRoles={moduleRolesMap[module.id] ?? []}
              isUpdating={updatingCell === cellKey}
              onChangeRole={handleChangeRole}
            />
          );
        },
      })
    );

    return [...baseColumns, ...moduleColumns];
  }, [assignableModules, moduleRolesMap, updatingCell, handleChangeRole]);

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  const isLoading =
    isLoadingModules ||
    isLoadingRoles ||
    !memberships?.data ||
    memberships?.isFetching;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SettingsLayout
      title="Module Access"
      description="Manage user access to modules. Assign users to Treasury, Compliance, or Tokenisation with specific roles."
    >
      <div className="space-y-6">
        {/* Summary Cards */}
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
                className="h-7 w-48 border-input pr-2 pl-7 text-xs placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
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
