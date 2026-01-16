# Module Access Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Module Access page where Owners/Admins can assign users to modules (Treasury, Compliance, Tokenisation) with module-specific roles.

**Architecture:** Two-layer access control - Global roles (from Clerk) determine org-level permissions, Module roles (from Core API) determine per-module access. Users need explicit module assignment; global role alone grants no module access.

**Tech Stack:** TanStack Router, oRPC + React Query, Clerk for auth, Core API for module roles, Tailwind CSS with design system classes.

**Requirements Doc:** `docs/requirements/008-module-access.md`

---

## Phase 1: API Layer

### Task 1: Create Zod Schemas for Module Access

**Files:**
- Create: `src/features/settings/schema.ts`

**Step 1: Write the schema file**

```typescript
import { z } from 'zod';

// Module definition from API
export const zModule = z.object({
  id: z.string().uuid(),
  name: z.string(),
  display_name: z.string(),
  is_active: z.boolean(),
});

export type Module = z.infer<typeof zModule>;

// Module role definition from API
export const zModuleRole = z.object({
  id: z.string().uuid(),
  name: z.string(),
  display_name: z.string(),
});

export type ModuleRole = z.infer<typeof zModuleRole>;

// User's module assignment
export const zUserModuleAssignment = z.object({
  module_id: z.string(),
  role: z.string(),
  granted_by: z.string().optional(),
  created_at: z.string().optional(),
});

export type UserModuleAssignment = z.infer<typeof zUserModuleAssignment>;

// Response schemas
export const zModulesListResponse = z.object({
  modules: z.array(zModule),
});

export const zModuleRolesResponse = z.object({
  roles: z.array(zModuleRole),
});

// Input schemas for mutations
export const zAssignModuleRoleInput = z.object({
  userId: z.string(),
  moduleId: z.string(),
  role: z.string(),
});

export type AssignModuleRoleInput = z.infer<typeof zAssignModuleRoleInput>;

export const zRemoveModuleRoleInput = z.object({
  userId: z.string(),
  moduleId: z.string(),
});

export type RemoveModuleRoleInput = z.infer<typeof zRemoveModuleRoleInput>;
```

**Step 2: Commit**

```bash
git add src/features/settings/schema.ts
git commit -m "feat(settings): add zod schemas for module access"
```

---

### Task 2: Extend Module Repository with Assignment Methods

**Files:**
- Modify: `src/server/core-api/repositories/module.repository.ts`

**Step 1: Add assignment methods to repository**

Add these methods after existing methods in `ModuleRepository` class:

```typescript
  async getUserRoles(orgId: string, userId: string) {
    const { data, response } = await coreApiClient.GET(
      '/v2/organisations/{orgId}/users/{userId}/roles',
      {
        headers: this.headers,
        params: { path: { orgId, userId } },
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async assignModuleRole(
    orgId: string,
    userId: string,
    moduleId: string,
    role: string
  ) {
    const { data, response } = await coreApiClient.POST(
      '/v2/organisations/{orgId}/users/{userId}/module-roles',
      {
        headers: this.headers,
        params: { path: { orgId, userId } },
        body: { module_id: moduleId, role },
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async removeModuleRole(orgId: string, userId: string, moduleId: string) {
    const { response } = await coreApiClient.DELETE(
      '/v2/organisations/{orgId}/users/{userId}/module-roles/{moduleId}',
      {
        headers: this.headers,
        params: { path: { orgId, userId, moduleId } },
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return { success: true };
  }
```

**Step 2: Commit**

```bash
git add src/server/core-api/repositories/module.repository.ts
git commit -m "feat(core-api): add module role assignment methods to repository"
```

---

### Task 3: Create Modules oRPC Router

**Files:**
- Create: `src/server/routers/modules.ts`

**Step 1: Create the router file**

```typescript
import { z } from 'zod';
import { clerkAuth } from '@/lib/auth/server';
import { protectedProcedure } from '@/server/orpc';
import { ModuleRepository } from '@/server/core-api/repositories/module.repository';
import { ORPCError } from '@orpc/server';
import {
  zModulesListResponse,
  zModuleRolesResponse,
  zAssignModuleRoleInput,
  zRemoveModuleRoleInput,
} from '@/features/settings/schema';

const tags = ['modules'];

export default {
  list: protectedProcedure({ permission: null })
    .route({ method: 'GET', path: '/modules', tags })
    .output(zModulesListResponse)
    .handler(async ({ context }) => {
      context.logger.info('Fetching modules list');

      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      const moduleRepo = new ModuleRepository(token);
      return await moduleRepo.list();
    }),

  getRoles: protectedProcedure({ permission: null })
    .route({ method: 'GET', path: '/modules/{moduleId}/roles', tags })
    .input(z.object({ moduleId: z.string() }))
    .output(zModuleRolesResponse)
    .handler(async ({ context, input }) => {
      context.logger.info({ moduleId: input.moduleId }, 'Fetching module roles');

      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      const moduleRepo = new ModuleRepository(token);
      return await moduleRepo.getRoles(input.moduleId);
    }),

  assignRole: protectedProcedure({ permission: null })
    .route({ method: 'POST', path: '/modules/assign-role', tags })
    .input(zAssignModuleRoleInput)
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ context, input }) => {
      context.logger.info(
        { userId: input.userId, moduleId: input.moduleId, role: input.role },
        'Assigning module role'
      );

      const authState = await clerkAuth();
      const token = await authState.getToken();
      const orgId = authState.orgId;

      if (!token || !orgId) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token or organization available',
        });
      }

      const moduleRepo = new ModuleRepository(token);
      await moduleRepo.assignModuleRole(orgId, input.userId, input.moduleId, input.role);

      return { success: true };
    }),

  removeRole: protectedProcedure({ permission: null })
    .route({ method: 'POST', path: '/modules/remove-role', tags })
    .input(zRemoveModuleRoleInput)
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ context, input }) => {
      context.logger.info(
        { userId: input.userId, moduleId: input.moduleId },
        'Removing module role'
      );

      const authState = await clerkAuth();
      const token = await authState.getToken();
      const orgId = authState.orgId;

      if (!token || !orgId) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token or organization available',
        });
      }

      const moduleRepo = new ModuleRepository(token);
      await moduleRepo.removeModuleRole(orgId, input.userId, input.moduleId);

      return { success: true };
    }),
};
```

**Step 2: Register router in main router**

In `src/server/router.ts`, add:

```typescript
import modulesRouter from './routers/modules';

export const router = {
  // ... existing routers
  modules: modulesRouter,
};
```

**Step 3: Commit**

```bash
git add src/server/routers/modules.ts src/server/router.ts
git commit -m "feat(server): add modules oRPC router for module access management"
```

---

## Phase 2: Navigation & Routing

### Task 4: Add Module Access to Navigation

**Files:**
- Modify: `src/lib/modules/config.ts`

**Step 1: Add ShieldCheck import**

At the top imports, add `ShieldCheckIcon`:

```typescript
import {
  // ... existing imports
  ShieldCheckIcon,
} from 'lucide-react';
```

**Step 2: Add nav item to Global module**

Find the `global` module config (around line 137) and add after 'Roles':

```typescript
{
  label: 'Module Access',
  path: '/global/module-access',
  icon: ShieldCheckIcon,
  testId: 'nav-global-module-access',
},
```

**Step 3: Commit**

```bash
git add src/lib/modules/config.ts
git commit -m "feat(nav): add Module Access to Global navigation"
```

---

### Task 5: Create Module Access Route

**Files:**
- Create: `src/routes/_app/global/module-access.tsx`

**Step 1: Create the route file**

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { PageSettingsModuleAccess } from '@/features/settings/page-settings-module-access';

export const Route = createFileRoute('/_app/global/module-access')({
  component: PageSettingsModuleAccess,
});
```

**Step 2: Commit**

```bash
git add src/routes/_app/global/module-access.tsx
git commit -m "feat(routes): add module-access route"
```

---

## Phase 3: Components

### Task 6: Create Module Summary Cards Component

**Files:**
- Create: `src/features/settings/components/module-summary-cards.tsx`

**Step 1: Create the component**

```typescript
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
              'border-card rounded-lg p-4 text-left transition-all',
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
```

**Step 2: Commit**

```bash
git add src/features/settings/components/module-summary-cards.tsx
git commit -m "feat(settings): add ModuleSummaryCards component"
```

---

### Task 7: Create Module Role Dropdown Component

**Files:**
- Create: `src/features/settings/components/module-role-dropdown.tsx`

**Step 1: Create the component**

```typescript
import { useState } from 'react';
import { ChevronDownIcon, CheckIcon } from 'lucide-react';
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
    ? roles.find((r) => r.name === currentRole)?.display_name ?? currentRole
    : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          'flex h-8 min-w-[120px] items-center justify-between gap-2 rounded px-2 text-xs',
          currentRole
            ? 'bg-neutral-100 text-neutral-900'
            : 'text-neutral-400',
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
          <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                onSelectRole(null);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-600 hover-subtle"
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
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-900 hover-subtle"
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
```

**Step 2: Commit**

```bash
git add src/features/settings/components/module-role-dropdown.tsx
git commit -m "feat(settings): add ModuleRoleDropdown component"
```

---

### Task 8: Create Module Access Table Component

**Files:**
- Create: `src/features/settings/components/module-access-table.tsx`

**Step 1: Create the component**

```typescript
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
            <th className="pb-3 pr-4">User</th>
            <th className="pb-3 pr-4">Global Role</th>
            {assignableModules.map((module) => (
              <th key={module.id} className="pb-3 pr-4">
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
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500">{member.email}</div>
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
```

**Step 2: Commit**

```bash
git add src/features/settings/components/module-access-table.tsx
git commit -m "feat(settings): add ModuleAccessTable component"
```

---

## Phase 4: Main Page

### Task 9: Create Module Access Page

**Files:**
- Create: `src/features/settings/page-settings-module-access.tsx`

**Step 1: Create the page component**

```typescript
import { useState, useMemo, useEffect } from 'react';
import { useOrganization } from '@clerk/tanstack-react-start';
import { SearchIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { orpc } from '@/lib/orpc/client';
import { SettingsLayout } from './components/settings-layout';
import { ModuleSummaryCards } from './components/module-summary-cards';
import { ModuleAccessTable } from './components/module-access-table';
import type { Module, ModuleRole } from './schema';

// Map Clerk role to display name
const clerkRoleToGlobalRole = (role: string): string => {
  const roleMap: Record<string, string> = {
    'org:owner': 'owner',
    'org:admin': 'admin',
    'org:billing': 'billing',
    'org:member': 'member',
    'org:auditor': 'auditor',
  };
  return roleMap[role] ?? role;
};

export function PageSettingsModuleAccess() {
  const { organization, memberships, invitations } = useOrganization({
    memberships: { infinite: true },
    invitations: { infinite: true },
  });

  // Fetch all pages of memberships
  useEffect(() => {
    if (memberships?.hasNextPage && !memberships?.isFetching) {
      memberships.fetchNext();
    }
  }, [memberships?.hasNextPage, memberships?.isFetching, memberships?.fetchNext]);

  // Fetch modules
  const { data: modulesData } = orpc.modules.list.useQuery({});

  // State for module roles (fetched on demand)
  const [moduleRoles, setModuleRoles] = useState<Record<string, ModuleRole[]>>(
    {}
  );

  // Fetch roles for each module
  const modules = modulesData?.modules ?? [];
  useEffect(() => {
    const fetchRoles = async () => {
      const rolesMap: Record<string, ModuleRole[]> = {};
      for (const module of modules) {
        if (module.id !== 'global') {
          try {
            // This would need to be a separate query per module
            // For now, using mock data - replace with actual API call
            rolesMap[module.id] = [];
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
    const activeMembers = (memberships?.data ?? []).map((m) => ({
      id: m.publicUserData?.userId ?? m.id,
      name:
        `${m.publicUserData?.firstName ?? ''} ${m.publicUserData?.lastName ?? ''}`.trim() ||
        'Unknown',
      email: m.publicUserData?.identifier ?? '',
      globalRole: clerkRoleToGlobalRole(m.role),
      status: 'active' as const,
      moduleAssignments: {} as Record<string, string>, // TODO: Fetch from API
    }));

    const pendingMembers = (invitations?.data ?? []).map((inv) => ({
      id: inv.id,
      name: inv.emailAddress,
      email: inv.emailAddress,
      globalRole: clerkRoleToGlobalRole(inv.role ?? 'org:member'),
      status: 'pending' as const,
      moduleAssignments: {} as Record<string, string>,
    }));

    return [...activeMembers, ...pendingMembers];
  }, [memberships?.data, invitations?.data]);

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
  const assignRoleMutation = orpc.modules.assignRole.useMutation();
  const removeRoleMutation = orpc.modules.removeRole.useMutation();

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
        toast.success('Module access removed');
      } else {
        await assignRoleMutation.mutateAsync({ userId, moduleId, role });
        toast.success('Module access updated');
      }
    } catch (error) {
      toast.error('Failed to update module access');
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
      <ModuleSummaryCards
        modules={modules.filter((m) => m.id !== 'global')}
        userCounts={userCounts}
        roleCounts={roleCounts}
        selectedModule={selectedModule}
        onSelectModule={setSelectedModule}
      />

      <div className="mb-4">
        <div className="relative w-64">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
      </div>

      <ModuleAccessTable
        members={filteredMembers}
        modules={modules}
        moduleRoles={moduleRoles}
        loadingCell={loadingCell}
        onAssignRole={handleAssignRole}
      />
    </SettingsLayout>
  );
}
```

**Step 2: Commit**

```bash
git add src/features/settings/page-settings-module-access.tsx
git commit -m "feat(settings): add PageSettingsModuleAccess page component"
```

---

## Phase 5: Testing & Verification

### Task 10: Run Lint and Type Check

**Step 1: Run lint**

```bash
pnpm lint
```

Expected: No errors (fix any that appear)

**Step 2: Run type check**

```bash
pnpm tsc --noEmit
```

Expected: No errors (fix any that appear)

**Step 3: Run tests**

```bash
pnpm test:ci
```

Expected: All tests pass

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve lint and type errors"
```

---

### Task 11: Manual Testing Verification

**Step 1: Start dev server**

```bash
pnpm dev
```

**Step 2: Verify navigation**

1. Navigate to `/global`
2. Confirm "Module Access" appears in sidebar
3. Click "Module Access"
4. Confirm page loads without errors

**Step 3: Verify page functionality**

1. Confirm summary cards display
2. Confirm users table displays
3. Confirm search filter works
4. Test clicking module card to filter
5. Test role dropdown opens and closes

**Step 4: Document any issues for follow-up**

---

### Task 12: Add Unit Tests for Schema

**Files:**
- Create: `src/features/settings/schema.unit.spec.ts`

**Step 1: Write schema tests**

```typescript
import { describe, it, expect } from 'vitest';
import {
  zModule,
  zModuleRole,
  zAssignModuleRoleInput,
  zRemoveModuleRoleInput,
} from './schema';

describe('Module Access Schemas', () => {
  describe('zModule', () => {
    it('should validate a valid module', () => {
      const module = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'treasury',
        display_name: 'Treasury',
        is_active: true,
      };
      expect(zModule.parse(module)).toEqual(module);
    });

    it('should reject invalid uuid', () => {
      const module = {
        id: 'not-a-uuid',
        name: 'treasury',
        display_name: 'Treasury',
        is_active: true,
      };
      expect(() => zModule.parse(module)).toThrow();
    });
  });

  describe('zModuleRole', () => {
    it('should validate a valid role', () => {
      const role = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'admin',
        display_name: 'Admin',
      };
      expect(zModuleRole.parse(role)).toEqual(role);
    });
  });

  describe('zAssignModuleRoleInput', () => {
    it('should validate valid input', () => {
      const input = {
        userId: 'user_123',
        moduleId: 'treasury',
        role: 'admin',
      };
      expect(zAssignModuleRoleInput.parse(input)).toEqual(input);
    });

    it('should reject missing fields', () => {
      expect(() => zAssignModuleRoleInput.parse({})).toThrow();
    });
  });

  describe('zRemoveModuleRoleInput', () => {
    it('should validate valid input', () => {
      const input = {
        userId: 'user_123',
        moduleId: 'treasury',
      };
      expect(zRemoveModuleRoleInput.parse(input)).toEqual(input);
    });
  });
});
```

**Step 2: Run tests**

```bash
pnpm test:ci
```

Expected: All tests pass including new schema tests

**Step 3: Commit**

```bash
git add src/features/settings/schema.unit.spec.ts
git commit -m "test(settings): add unit tests for module access schemas"
```

---

### Task 13: Final Verification and Build

**Step 1: Run full test suite**

```bash
pnpm test:ci
```

**Step 2: Run build**

```bash
pnpm build
```

Expected: Build succeeds without errors

**Step 3: Final commit if needed**

```bash
git add -A
git commit -m "chore: final cleanup for module access feature"
```

---

## Summary

| Phase | Tasks | Purpose |
|-------|-------|---------|
| 1: API Layer | Tasks 1-3 | Schemas, repository, oRPC router |
| 2: Navigation | Tasks 4-5 | Add nav item and route |
| 3: Components | Tasks 6-8 | Summary cards, dropdown, table |
| 4: Main Page | Task 9 | Module Access page |
| 5: Testing | Tasks 10-13 | Lint, types, tests, build |

**Total commits:** ~12 small, focused commits

**Next steps after implementation:**
1. Integrate actual module role API calls (currently using empty arrays)
2. Fetch user's existing module assignments from API
3. Add browser tests for component interactions
4. Move Workspaces to Treasury (separate task)
