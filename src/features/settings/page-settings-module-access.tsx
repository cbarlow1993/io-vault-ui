import { useOrganization } from '@clerk/tanstack-react-start';
import { useMutation, useQuery } from '@tanstack/react-query';
import { SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';

import { Input } from '@/components/ui/input';

import { ModuleAccessTable } from './components/module-access-table';
import { ModuleSummaryCards } from './components/module-summary-cards';
import { SettingsLayout } from './components/settings-layout';
import {
  mapClerkRole,
  mapInvitation,
  mapMembership,
} from './lib/clerk-members';
import type { Module, ModuleRole } from './schema';

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

  // Wrap modules in useMemo to prevent dependency changes on every render
  const modules = useMemo<Module[]>(
    () => modulesData?.modules ?? [],
    [modulesData?.modules]
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
            // Fetch roles for this module from the API
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

  // Map Clerk members to our format
  const members = useMemo(() => {
    const activeMembers = (memberships?.data ?? []).map((m) => {
      const mapped = mapMembership(m);
      return {
        id: mapped.id,
        name: mapped.name,
        email: mapped.email,
        avatarUrl: mapped.avatarUrl,
        globalRole: mapClerkRole(m.role),
        status: 'active' as const,
        // Module assignments will be fetched from API in a future enhancement
        moduleAssignments: {} as Record<string, string>,
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
  }, [memberships?.data, invitations?.data]);

  const isLoading =
    isLoadingModules || !memberships?.data || memberships?.isFetching;

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
  const assignRoleMutation = useMutation(
    orpc.modules.assignRole.mutationOptions({
      onSuccess: () => {
        toast.success('Module access updated');
      },
      onError: () => {
        toast.error('Failed to update module access');
      },
    })
  );

  const removeRoleMutation = useMutation(
    orpc.modules.removeRole.mutationOptions({
      onSuccess: () => {
        toast.success('Module access removed');
      },
      onError: () => {
        toast.error('Failed to remove module access');
      },
    })
  );

  // Handle role assignment
  const handleAssignRole = async (
    userId: string,
    moduleId: string,
    role: string | null
  ) => {
    setLoadingCell({ userId, moduleId });

    try {
      if (role === null) {
        await removeRoleMutation.mutateAsync({ userId, moduleId });
      } else {
        await assignRoleMutation.mutateAsync({ userId, moduleId, role });
      }
    } finally {
      setLoadingCell(null);
    }
  };

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

  return (
    <SettingsLayout
      title="Module Access"
      description="Manage user access to modules. Assign users to Treasury, Compliance, or Tokenisation with specific roles."
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-neutral-500">Loading...</div>
        </div>
      ) : (
        <div className="space-y-6">
          <ModuleSummaryCards
            modules={modules.filter((m: Module) => m.id !== 'global')}
            userCounts={userCounts}
            roleCounts={roleCounts}
            selectedModule={selectedModule}
            onSelectModule={setSelectedModule}
          />

          <div className="flex items-center gap-3">
            <div className="relative max-w-xs flex-1">
              <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-none border-neutral-200 pl-10 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
          </div>

          <div className="border border-neutral-200">
            <ModuleAccessTable
              members={filteredMembers}
              modules={modules}
              moduleRoles={moduleRoles}
              loadingCell={loadingCell}
              onAssignRole={handleAssignRole}
            />
            {filteredMembers.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-neutral-500">No users found</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </div>

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
      )}
    </SettingsLayout>
  );
}
