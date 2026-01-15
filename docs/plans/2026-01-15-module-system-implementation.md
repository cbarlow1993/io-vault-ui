# Module System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement an Atlassian-style module system with Treasury, Compliance, and Global modules, each with distinct navigation, theming, and access control.

**Architecture:** Module-aware routing with context providers at the layout level. Each module has its own navigation config, accent color, and route tree. Access is controlled by org-level licensing plus role-based permissions within modules.

**Tech Stack:** TanStack Router (file-based), React Context, Tailwind CSS v4 with CSS variables, Zod for schemas.

---

## Phase 1: Foundation

### Task 1.1: Module Types and Schemas

**Files:**
- Create: `src/lib/modules/types.ts`

**Step 1: Create module type definitions**

```typescript
// src/lib/modules/types.ts
import type { LucideIcon } from 'lucide-react';

export type ModuleId = 'treasury' | 'compliance' | 'global';

export type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  testId: string;
  children?: Omit<NavItem, 'children'>[];
};

export type ModuleConfig = {
  id: ModuleId;
  name: string;
  icon: LucideIcon;
  accent: 'blue' | 'emerald' | 'violet';
  navItems: NavItem[];
  defaultPath: string;
  requiresWorkspace: boolean;
};

export type ModuleAccess = {
  hasAccess: boolean;
  reason?: 'not_licensed' | 'no_role';
};
```

**Step 2: Commit**

```bash
git add src/lib/modules/types.ts
git commit -m "feat(modules): add module type definitions"
```

---

### Task 1.2: Module Configuration

**Files:**
- Create: `src/lib/modules/config.ts`

**Step 1: Create module configuration with nav items**

```typescript
// src/lib/modules/config.ts
import {
  ArrowRightLeftIcon,
  BookUserIcon,
  BuildingIcon,
  CreditCardIcon,
  FingerprintIcon,
  FoldersIcon,
  GridIcon,
  KeyIcon,
  ListChecksIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldIcon,
  ShieldCheckIcon,
  UsersIcon,
  Users2Icon,
  ActivityIcon,
  FileTextIcon,
  GlobeIcon,
  VaultIcon,
} from 'lucide-react';

import type { ModuleConfig, ModuleId } from './types';

export const moduleConfig: Record<ModuleId, ModuleConfig> = {
  treasury: {
    id: 'treasury',
    name: 'Treasury',
    icon: VaultIcon,
    accent: 'blue',
    requiresWorkspace: true,
    defaultPath: '/treasury/overview',
    navItems: [
      {
        label: 'Overview',
        path: '/treasury/overview',
        icon: GridIcon,
        testId: 'nav-treasury-overview',
      },
      {
        label: 'Vaults',
        path: '/treasury/vaults',
        icon: KeyIcon,
        testId: 'nav-treasury-vaults',
        children: [
          {
            label: 'Vaults',
            path: '/treasury/vaults',
            icon: KeyIcon,
            testId: 'nav-treasury-vaults-list',
          },
          {
            label: 'Signers',
            path: '/treasury/signers',
            icon: FingerprintIcon,
            testId: 'nav-treasury-signers',
          },
        ],
      },
      {
        label: 'Policies',
        path: '/treasury/policies',
        icon: ShieldCheckIcon,
        testId: 'nav-treasury-policies',
        children: [
          {
            label: 'Whitelists',
            path: '/treasury/policies/whitelists',
            icon: ListChecksIcon,
            testId: 'nav-treasury-whitelists',
          },
          {
            label: 'Transactions',
            path: '/treasury/policies/transactions',
            icon: ArrowRightLeftIcon,
            testId: 'nav-treasury-transactions',
          },
        ],
      },
      {
        label: 'Address Book',
        path: '/treasury/address-book',
        icon: BookUserIcon,
        testId: 'nav-treasury-address-book',
      },
      {
        label: 'Settings',
        path: '/treasury/settings',
        icon: SettingsIcon,
        testId: 'nav-treasury-settings',
      },
    ],
  },
  compliance: {
    id: 'compliance',
    name: 'Compliance',
    icon: ShieldIcon,
    accent: 'emerald',
    requiresWorkspace: false,
    defaultPath: '/compliance/overview',
    navItems: [
      {
        label: 'Overview',
        path: '/compliance/overview',
        icon: GridIcon,
        testId: 'nav-compliance-overview',
      },
      {
        label: 'Monitoring',
        path: '/compliance/monitoring',
        icon: ActivityIcon,
        testId: 'nav-compliance-monitoring',
      },
      {
        label: 'Identities',
        path: '/compliance/identities',
        icon: UsersIcon,
        testId: 'nav-compliance-identities',
      },
      {
        label: 'Reports',
        path: '/compliance/reports',
        icon: FileTextIcon,
        testId: 'nav-compliance-reports',
      },
      {
        label: 'Settings',
        path: '/compliance/settings',
        icon: SettingsIcon,
        testId: 'nav-compliance-settings',
      },
    ],
  },
  global: {
    id: 'global',
    name: 'Global',
    icon: GlobeIcon,
    accent: 'violet',
    requiresWorkspace: false,
    defaultPath: '/global/users',
    navItems: [
      {
        label: 'Users',
        path: '/global/users',
        icon: UsersIcon,
        testId: 'nav-global-users',
      },
      {
        label: 'Roles',
        path: '/global/roles',
        icon: ShieldIcon,
        testId: 'nav-global-roles',
      },
      {
        label: 'Teams',
        path: '/global/teams',
        icon: Users2Icon,
        testId: 'nav-global-teams',
      },
      {
        label: 'Workspaces',
        path: '/global/workspaces',
        icon: FoldersIcon,
        testId: 'nav-global-workspaces',
      },
      {
        label: 'Organization',
        path: '/global/organization',
        icon: BuildingIcon,
        testId: 'nav-global-organization',
      },
      {
        label: 'Billing',
        path: '/global/billing',
        icon: CreditCardIcon,
        testId: 'nav-global-billing',
      },
      {
        label: 'Audit Log',
        path: '/global/audit-log',
        icon: ScrollTextIcon,
        testId: 'nav-global-audit-log',
      },
    ],
  },
};

export const moduleIds: ModuleId[] = ['treasury', 'compliance', 'global'];

export function getModuleFromPath(pathname: string): ModuleId | null {
  for (const id of moduleIds) {
    if (pathname.startsWith(`/${id}`)) {
      return id;
    }
  }
  return null;
}
```

**Step 2: Commit**

```bash
git add src/lib/modules/config.ts
git commit -m "feat(modules): add module configuration with nav items"
```

---

### Task 1.3: Module Context Provider

**Files:**
- Create: `src/lib/modules/module-context.tsx`

**Step 1: Create module context**

```typescript
// src/lib/modules/module-context.tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useRouter, useRouterState } from '@tanstack/react-router';

import { moduleConfig, getModuleFromPath, moduleIds } from './config';
import type { ModuleId, ModuleConfig } from './types';

type ModuleContextValue = {
  currentModule: ModuleId;
  moduleConfig: ModuleConfig;
  availableModules: ModuleId[];
  switchModule: (moduleId: ModuleId) => void;
};

const ModuleContext = createContext<ModuleContextValue | null>(null);

const STORAGE_KEY = 'lastModule';

function getStoredModule(): ModuleId | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && moduleIds.includes(stored as ModuleId)) {
    return stored as ModuleId;
  }
  return null;
}

function setStoredModule(moduleId: ModuleId): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, moduleId);
}

type ModuleProviderProps = {
  children: ReactNode;
  availableModules?: ModuleId[];
};

export function ModuleProvider({
  children,
  availableModules = moduleIds,
}: ModuleProviderProps) {
  const router = useRouter();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  // Derive current module from URL
  const currentModuleFromPath = getModuleFromPath(pathname);
  const [currentModule, setCurrentModule] = useState<ModuleId>(() => {
    return currentModuleFromPath ?? getStoredModule() ?? availableModules[0] ?? 'treasury';
  });

  // Sync with URL changes
  useEffect(() => {
    if (currentModuleFromPath && currentModuleFromPath !== currentModule) {
      setCurrentModule(currentModuleFromPath);
      setStoredModule(currentModuleFromPath);
    }
  }, [currentModuleFromPath, currentModule]);

  const switchModule = useCallback(
    (moduleId: ModuleId) => {
      if (!availableModules.includes(moduleId)) return;

      setCurrentModule(moduleId);
      setStoredModule(moduleId);

      const config = moduleConfig[moduleId];
      router.navigate({ to: config.defaultPath });
    },
    [availableModules, router]
  );

  const value: ModuleContextValue = {
    currentModule,
    moduleConfig: moduleConfig[currentModule],
    availableModules,
    switchModule,
  };

  return (
    <ModuleContext.Provider value={value}>{children}</ModuleContext.Provider>
  );
}

export function useModule(): ModuleContextValue {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModule must be used within a ModuleProvider');
  }
  return context;
}

export function useModuleConfig(moduleId?: ModuleId): ModuleConfig {
  const { currentModule } = useModule();
  return moduleConfig[moduleId ?? currentModule];
}
```

**Step 2: Commit**

```bash
git add src/lib/modules/module-context.tsx
git commit -m "feat(modules): add module context provider with persistence"
```

---

### Task 1.4: Module Index Export

**Files:**
- Create: `src/lib/modules/index.ts`

**Step 1: Create barrel export**

```typescript
// src/lib/modules/index.ts
export * from './types';
export * from './config';
export * from './module-context';
```

**Step 2: Commit**

```bash
git add src/lib/modules/index.ts
git commit -m "feat(modules): add barrel export"
```

---

## Phase 2: CSS Theming

### Task 2.1: Add Module Accent CSS Variables

**Files:**
- Modify: `src/styles/app.css`

**Step 1: Add module accent variables after line 179 (after `:root` block)**

Add the following CSS after the `:root { ... }` block and before the `.dark { ... }` block:

```css
/* Module accent theming */
:root {
  --module-accent: var(--color-brand-500);
  --module-accent-light: var(--color-brand-50);
  --module-accent-hover: var(--color-brand-600);
}

[data-module='treasury'] {
  --module-accent: var(--color-brand-500);
  --module-accent-light: var(--color-brand-50);
  --module-accent-hover: var(--color-brand-600);
}

[data-module='compliance'] {
  --module-accent: oklch(0.627 0.194 149.214);
  --module-accent-light: oklch(0.982 0.018 155.826);
  --module-accent-hover: oklch(0.527 0.154 150.069);
}

[data-module='global'] {
  --module-accent: var(--color-indigo-500);
  --module-accent-light: var(--color-indigo-50);
  --module-accent-hover: var(--color-indigo-600);
}
```

**Step 2: Add module accent utility classes in `@layer components`**

Add after the `.interactive-icon-button` class:

```css
  /* Module-aware accent colors
   * Uses CSS variables that change based on [data-module] attribute
   */
  .bg-module-accent {
    background-color: var(--module-accent);
  }

  .bg-module-accent-light {
    background-color: var(--module-accent-light);
  }

  .text-module-accent {
    color: var(--module-accent);
  }

  .border-module-accent {
    border-color: var(--module-accent);
  }

  .hover-module-accent:hover {
    background-color: var(--module-accent-hover);
  }
```

**Step 3: Commit**

```bash
git add src/styles/app.css
git commit -m "feat(modules): add module accent CSS variables and utilities"
```

---

## Phase 3: UI Components

### Task 3.1: Module Switcher Component

**Files:**
- Create: `src/layout/shell/module-switcher.tsx`

**Step 1: Create the module switcher dropdown**

```typescript
// src/layout/shell/module-switcher.tsx
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

import { useModule, moduleConfig } from '@/lib/modules';
import type { ModuleId } from '@/lib/modules';

type Organization = {
  id: string;
  name: string;
  initials: string;
};

type Workspace = {
  id: string;
  name: string;
  orgId: string;
};

// TODO: Replace with real data from API
const organizations: Organization[] = [
  { id: 'org-1', name: 'Acme Corporation', initials: 'AC' },
];

const workspaces: Workspace[] = [
  { id: 'ws-1', name: 'Treasury Operations', orgId: 'org-1' },
  { id: 'ws-2', name: 'Investment Portfolio', orgId: 'org-1' },
];

export function ModuleSwitcher() {
  const { currentModule, availableModules, switchModule, moduleConfig: currentConfig } = useModule();

  const [selectedOrg] = useState<Organization>(organizations[0]!);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace>(workspaces[0]!);

  const orgWorkspaces = workspaces.filter((ws) => ws.orgId === selectedOrg.id);
  const showWorkspaces = currentConfig.requiresWorkspace;

  const handleModuleSelect = (moduleId: ModuleId) => {
    switchModule(moduleId);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-auto rounded-none px-0 hover:bg-transparent"
            >
              <div
                className="flex size-8 items-center justify-center text-xs font-semibold text-white bg-module-accent"
              >
                {selectedOrg.initials}
              </div>
              <div className="flex flex-1 flex-col text-left">
                <span className="text-xs font-medium text-neutral-500">
                  {selectedOrg.name}
                </span>
                <span className="text-sm font-semibold text-neutral-900">
                  {currentConfig.name}
                  {showWorkspaces && ` · ${selectedWorkspace.name}`}
                </span>
              </div>
              <ChevronsUpDownIcon className="size-4 text-neutral-400" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-none border-neutral-200 p-0 shadow-lg"
            align="start"
            sideOffset={8}
          >
            {/* Organization - for now just display, multi-org later */}
            <DropdownMenuLabel className="px-3 py-2 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
              Organization
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-default rounded-none px-3 py-2">
                <div className="flex size-6 items-center justify-center bg-neutral-100 text-[10px] font-semibold text-neutral-700">
                  {selectedOrg.initials}
                </div>
                <span className="flex-1 text-sm">{selectedOrg.name}</span>
                <CheckIcon className="size-4 text-neutral-900" />
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="my-0" />

            {/* Modules */}
            <DropdownMenuLabel className="px-3 py-2 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
              Module
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {availableModules.map((moduleId) => {
                const config = moduleConfig[moduleId];
                const ModuleIcon = config.icon;
                return (
                  <DropdownMenuItem
                    key={moduleId}
                    onClick={() => handleModuleSelect(moduleId)}
                    className="cursor-pointer rounded-none px-3 py-2"
                  >
                    <ModuleIcon className="size-4 text-neutral-500" />
                    <span className="flex-1 text-sm">{config.name}</span>
                    {currentModule === moduleId && (
                      <CheckIcon className="size-4 text-neutral-900" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>

            {/* Workspaces - only for Treasury */}
            {showWorkspaces && (
              <>
                <DropdownMenuSeparator className="my-0" />
                <DropdownMenuLabel className="px-3 py-2 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Workspace
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {orgWorkspaces.map((ws) => (
                    <DropdownMenuItem
                      key={ws.id}
                      onClick={() => setSelectedWorkspace(ws)}
                      className="cursor-pointer rounded-none px-3 py-2"
                    >
                      <span className="flex-1 text-sm">{ws.name}</span>
                      {selectedWorkspace.id === ws.id && (
                        <CheckIcon className="size-4 text-neutral-900" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="my-0" />

                <DropdownMenuGroup>
                  <DropdownMenuItem asChild className="cursor-pointer rounded-none px-3 py-2 text-neutral-600">
                    <Link to="/global/workspaces">
                      <PlusIcon className="size-4" />
                      <span className="text-sm">Create Workspace</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
```

**Step 2: Commit**

```bash
git add src/layout/shell/module-switcher.tsx
git commit -m "feat(modules): add module switcher component"
```

---

### Task 3.2: Module-Aware Navigation Menu

**Files:**
- Create: `src/layout/shell/module-nav-menu.tsx`

**Step 1: Create module-aware nav menu**

```typescript
// src/layout/shell/module-nav-menu.tsx
import { Link, useRouterState } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/tailwind/utils';
import { useModule } from '@/lib/modules';
import type { NavItem } from '@/lib/modules';

import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ModuleNavMenu() {
  const { moduleConfig } = useModule();
  const navItems = moduleConfig.navItems;

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const item of navItems) {
      if (item.children) {
        const hasActiveChild = item.children.some((child) =>
          pathname.startsWith(child.path)
        );
        if (hasActiveChild) {
          initial.add(item.label);
        }
      }
    }
    return initial;
  });

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const isNavItemActive = (itemPath: string) => {
    return pathname.startsWith(itemPath);
  };

  const hasActiveChild = (item: NavItem) => {
    if (!item.children) return false;
    return item.children.some((child) => isNavItemActive(child.path));
  };

  return (
    <SidebarContent className="px-2 pt-2">
      <SidebarMenu className="space-y-0.5">
        {navItems.map((item) => (
          <SidebarMenuItem key={item.path}>
            {item.children ? (
              <>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        data-testid={item.testId}
                        onClick={() => toggleSection(item.label)}
                        isActive={hasActiveChild(item)}
                        className="h-9 rounded-none border-l-2 border-transparent px-3 text-sm font-medium text-neutral-500 transition-all hover:border-neutral-300 hover:bg-transparent hover:text-neutral-900 data-[active=true]:border-module-accent data-[active=true]:bg-transparent data-[active=true]:text-neutral-900"
                      >
                        <item.icon className="size-4" strokeWidth={1.5} />
                        <span className="flex-1">{item.label}</span>
                        <ChevronRightIcon
                          className={cn(
                            'size-3.5 text-neutral-400 transition-transform duration-200',
                            expandedSections.has(item.label) && 'rotate-90'
                          )}
                        />
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right" className="rounded-none">
                        {item.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

                {expandedSections.has(item.label) && (
                  <SidebarMenuSub className="mt-0.5 ml-4 border-l-0 px-0">
                    {item.children.map((child) => (
                      <SidebarMenuSubItem key={child.path}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={isNavItemActive(child.path)}
                          className={cn(
                            'h-8 rounded-none border-l-2 border-transparent px-3 text-sm font-medium text-neutral-500 transition-all hover:border-neutral-300 hover:bg-transparent hover:text-neutral-900',
                            isNavItemActive(child.path) &&
                              'border-module-accent bg-transparent text-neutral-900'
                          )}
                        >
                          <Link to={child.path} data-testid={child.testId}>
                            <child.icon className="size-3.5" strokeWidth={1.5} />
                            <span>{child.label}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </>
            ) : (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      asChild
                      isActive={isNavItemActive(item.path)}
                      className="h-9 rounded-none border-l-2 border-transparent px-3 text-sm font-medium text-neutral-500 transition-all hover:border-neutral-300 hover:bg-transparent hover:text-neutral-900 data-[active=true]:border-module-accent data-[active=true]:bg-transparent data-[active=true]:text-neutral-900"
                    >
                      <Link to={item.path} data-testid={item.testId}>
                        <item.icon className="size-4" strokeWidth={1.5} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right" className="rounded-none">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarContent>
  );
}
```

**Step 2: Commit**

```bash
git add src/layout/shell/module-nav-menu.tsx
git commit -m "feat(modules): add module-aware navigation menu"
```

---

### Task 3.3: Update NavSidebar to Use Module Components

**Files:**
- Modify: `src/layout/shell/nav-sidebar.tsx`

**Step 1: Replace OrgSwitcher with ModuleSwitcher and NavMenu with ModuleNavMenu**

Replace the entire file content:

```typescript
// src/layout/shell/nav-sidebar.tsx
import { type ReactNode } from 'react';

import {
  Sidebar,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

import { LogoIofinnet } from '@/assets/logo-iofinnet';
import { useModule } from '@/lib/modules';

import { ModuleNavMenu } from './module-nav-menu';
import { ModuleSwitcher } from './module-switcher';
import { NavUser } from './nav-user';

const SidebarToggle = () => {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <div className="flex h-12 items-center justify-between border-b border-neutral-200 px-3">
      {isCollapsed ? (
        <button
          type="button"
          onClick={toggleSidebar}
          className="mx-auto flex items-center justify-center"
        >
          <LogoIofinnet variant="icon" className="size-5" />
        </button>
      ) : (
        <>
          <LogoIofinnet variant="full" className="h-4 w-auto" />
          <SidebarTrigger className="size-8 rounded-none text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900" />
        </>
      )}
    </div>
  );
};

function SidebarContent() {
  const { currentModule } = useModule();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-neutral-200 bg-white font-inter"
      data-module={currentModule}
    >
      <SidebarHeader className="p-0">
        <SidebarToggle />
        <div className="border-b border-neutral-200 px-3 py-3 group-data-[collapsible=icon]:hidden group-data-[state=collapsed]:hidden">
          <ModuleSwitcher />
        </div>
      </SidebarHeader>
      <ModuleNavMenu />
      <NavUser />
      <SidebarRail />
    </Sidebar>
  );
}

export const NavSidebar = (props: { children?: ReactNode }) => {
  return (
    <SidebarProvider>
      <SidebarContent />
      <SidebarInset>{props.children}</SidebarInset>
    </SidebarProvider>
  );
};
```

**Step 2: Commit**

```bash
git add src/layout/shell/nav-sidebar.tsx
git commit -m "refactor(modules): update nav-sidebar to use module components"
```

---

## Phase 4: Layout Integration

### Task 4.1: Add ModuleProvider to App Layout

**Files:**
- Modify: `src/routes/_app.tsx`

**Step 1: Wrap Layout with ModuleProvider**

```typescript
// src/routes/_app.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';

import { PageError } from '@/components/errors/page-error';
import { ModuleProvider } from '@/lib/modules';

import { GuardAuthenticated } from '@/features/auth/guard-authenticated';
import { Layout } from '@/layout/shell';

export const Route = createFileRoute('/_app')({
  component: RouteComponent,
  notFoundComponent: () => <PageError type="404" />,
  errorComponent: () => <PageError type="error-boundary" />,
});

function RouteComponent() {
  return (
    <GuardAuthenticated>
      <ModuleProvider>
        <Layout>
          <Outlet />
        </Layout>
      </ModuleProvider>
    </GuardAuthenticated>
  );
}
```

**Step 2: Commit**

```bash
git add src/routes/_app.tsx
git commit -m "feat(modules): add ModuleProvider to app layout"
```

---

### Task 4.2: Add data-module Attribute to Layout Root

**Files:**
- Modify: `src/layout/shell/layout.tsx`

**Step 1: Read the current layout file and add data-module**

First check what the layout looks like, then add the data-module attribute to the root element so CSS theming works throughout the app.

```typescript
// Add to the root container element:
// data-module={currentModule}
// Import useModule from '@/lib/modules'
```

**Step 2: Commit**

```bash
git add src/layout/shell/layout.tsx
git commit -m "feat(modules): add data-module attribute to layout root"
```

---

## Phase 5: Route Structure

### Task 5.1: Create Treasury Module Routes

**Files:**
- Create: `src/routes/_app/treasury/route.tsx`
- Create: `src/routes/_app/treasury/index.tsx`
- Create: `src/routes/_app/treasury/overview.tsx`

**Step 1: Create treasury route layout**

```typescript
// src/routes/_app/treasury/route.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/treasury')({
  component: TreasuryLayout,
});

function TreasuryLayout() {
  return <Outlet />;
}
```

**Step 2: Create treasury index redirect**

```typescript
// src/routes/_app/treasury/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/treasury/')({
  beforeLoad: () => {
    throw redirect({ to: '/treasury/overview' });
  },
});
```

**Step 3: Create treasury overview page**

```typescript
// src/routes/_app/treasury/overview.tsx
import { createFileRoute } from '@tanstack/react-router';

import { PageLayout, PageLayoutContent } from '@/layout/shell/page-layout';
import { PageLayoutTopBar } from '@/layout/shell/page-layout-top-bar';

export const Route = createFileRoute('/_app/treasury/overview')({
  component: TreasuryOverviewPage,
});

function TreasuryOverviewPage() {
  return (
    <PageLayout>
      <PageLayoutTopBar title="Overview" />
      <PageLayoutContent>
        <div className="p-6">
          <h1 className="text-2xl font-semibold">Treasury Overview</h1>
          <p className="mt-2 text-neutral-600">
            Welcome to the Treasury module.
          </p>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
}
```

**Step 4: Commit**

```bash
git add src/routes/_app/treasury/
git commit -m "feat(modules): add treasury module routes"
```

---

### Task 5.2: Create Compliance Module Routes

**Files:**
- Create: `src/routes/_app/compliance/route.tsx`
- Create: `src/routes/_app/compliance/index.tsx`
- Create: `src/routes/_app/compliance/overview.tsx`

**Step 1: Create compliance route layout**

```typescript
// src/routes/_app/compliance/route.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/compliance')({
  component: ComplianceLayout,
});

function ComplianceLayout() {
  return <Outlet />;
}
```

**Step 2: Create compliance index redirect**

```typescript
// src/routes/_app/compliance/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/compliance/')({
  beforeLoad: () => {
    throw redirect({ to: '/compliance/overview' });
  },
});
```

**Step 3: Create compliance overview page**

```typescript
// src/routes/_app/compliance/overview.tsx
import { createFileRoute } from '@tanstack/react-router';

import { PageLayout, PageLayoutContent } from '@/layout/shell/page-layout';
import { PageLayoutTopBar } from '@/layout/shell/page-layout-top-bar';

export const Route = createFileRoute('/_app/compliance/overview')({
  component: ComplianceOverviewPage,
});

function ComplianceOverviewPage() {
  return (
    <PageLayout>
      <PageLayoutTopBar title="Overview" />
      <PageLayoutContent>
        <div className="p-6">
          <h1 className="text-2xl font-semibold">Compliance Overview</h1>
          <p className="mt-2 text-neutral-600">
            Welcome to the Compliance module.
          </p>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
}
```

**Step 4: Commit**

```bash
git add src/routes/_app/compliance/
git commit -m "feat(modules): add compliance module routes"
```

---

### Task 5.3: Create Global Module Routes

**Files:**
- Create: `src/routes/_app/global/route.tsx`
- Create: `src/routes/_app/global/index.tsx`
- Create: `src/routes/_app/global/users.tsx`

**Step 1: Create global route layout**

```typescript
// src/routes/_app/global/route.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/global')({
  component: GlobalLayout,
});

function GlobalLayout() {
  return <Outlet />;
}
```

**Step 2: Create global index redirect**

```typescript
// src/routes/_app/global/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/global/')({
  beforeLoad: () => {
    throw redirect({ to: '/global/users' });
  },
});
```

**Step 3: Create global users page**

```typescript
// src/routes/_app/global/users.tsx
import { createFileRoute } from '@tanstack/react-router';

import { PageLayout, PageLayoutContent } from '@/layout/shell/page-layout';
import { PageLayoutTopBar } from '@/layout/shell/page-layout-top-bar';

export const Route = createFileRoute('/_app/global/users')({
  component: GlobalUsersPage,
});

function GlobalUsersPage() {
  return (
    <PageLayout>
      <PageLayoutTopBar title="Users" />
      <PageLayoutContent>
        <div className="p-6">
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="mt-2 text-neutral-600">
            Manage users across your organization.
          </p>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
}
```

**Step 4: Commit**

```bash
git add src/routes/_app/global/
git commit -m "feat(modules): add global module routes"
```

---

### Task 5.4: Update Root Index Redirect

**Files:**
- Modify: `src/routes/_app/index.tsx`

**Step 1: Update to redirect to last module or treasury default**

```typescript
// src/routes/_app/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/')({
  beforeLoad: () => {
    // Get last visited module from localStorage
    const lastModule = typeof window !== 'undefined'
      ? localStorage.getItem('lastModule')
      : null;

    const defaultPaths: Record<string, string> = {
      treasury: '/treasury/overview',
      compliance: '/compliance/overview',
      global: '/global/users',
    };

    const redirectPath = lastModule && defaultPaths[lastModule]
      ? defaultPaths[lastModule]
      : '/treasury/overview';

    throw redirect({ to: redirectPath });
  },
});
```

**Step 2: Commit**

```bash
git add src/routes/_app/index.tsx
git commit -m "feat(modules): update root redirect to respect last module"
```

---

## Phase 6: Verification

### Task 6.1: Run Type Check

**Step 1: Run TypeScript compiler**

```bash
pnpm tsc --noEmit
```

Expected: No type errors

**Step 2: Fix any type errors if they occur**

---

### Task 6.2: Run Linter

**Step 1: Run ESLint**

```bash
pnpm lint
```

Expected: No lint errors (or only pre-existing ones)

**Step 2: Fix any lint errors if they occur**

---

### Task 6.3: Run Build

**Step 1: Run production build**

```bash
pnpm build
```

Expected: Build succeeds

---

### Task 6.4: Manual Testing

**Step 1: Start dev server**

```bash
pnpm dev
```

**Step 2: Test module switching**

1. Navigate to `/treasury/overview`
2. Verify Treasury accent color (blue) on active nav items
3. Open module switcher dropdown
4. Switch to Compliance module
5. Verify URL changes to `/compliance/overview`
6. Verify Compliance accent color (green) on active nav items
7. Switch to Global module
8. Verify URL changes to `/global/users`
9. Verify Global accent color (purple) on active nav items

**Step 3: Test persistence**

1. While on Compliance module, refresh the page
2. Verify you remain on Compliance (localStorage persistence)
3. Navigate to `/` root
4. Verify redirect to last visited module

---

### Task 6.5: Final Commit

**Step 1: Commit any remaining changes**

```bash
git add -A
git commit -m "feat(modules): complete module system implementation"
```

---

## Summary

This plan implements the core module system infrastructure:

1. **Module types and config** - Type definitions and navigation configuration
2. **Module context** - React context for module state and switching
3. **CSS theming** - CSS variables for module accent colors
4. **UI components** - ModuleSwitcher and ModuleNavMenu
5. **Route structure** - Treasury, Compliance, and Global module routes
6. **Persistence** - Last visited module saved to localStorage

**Not included in this plan (future work):**
- Moving existing pages under module routes
- Module access control and guards
- Workspace context for Treasury
- Backend integration for org licensing
- Permission system restructuring
