import { Link } from '@tanstack/react-router';
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';

import type { ModuleId } from '@/lib/modules';
import { moduleConfig, useModule } from '@/lib/modules';

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
  const {
    currentModule,
    availableModules,
    switchModule,
    moduleConfig: currentConfig,
  } = useModule();

  // eslint-disable-next-line @eslint-react/naming-convention/use-state -- setter will be used when multi-org is implemented
  const [selectedOrg] = useState<Organization>(organizations[0]!);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace>(
    workspaces[0]!
  );

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
              <div className="bg-module-accent flex size-8 items-center justify-center text-xs font-semibold text-white">
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
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer rounded-none px-3 py-2 text-neutral-600"
                  >
                    {/* TODO: Update to /global/workspaces when route is created */}
                    <Link to="/settings/workspaces">
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
