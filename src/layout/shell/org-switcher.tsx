import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';

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

const organizations: Organization[] = [
  { id: 'org-1', name: 'Acme Corporation', initials: 'AC' },
  { id: 'org-2', name: 'Global Industries', initials: 'GI' },
  { id: 'org-3', name: 'Tech Ventures', initials: 'TV' },
];

const workspaces: Workspace[] = [
  { id: 'ws-1', name: 'Treasury Operations', orgId: 'org-1' },
  { id: 'ws-2', name: 'Investment Portfolio', orgId: 'org-1' },
  { id: 'ws-3', name: 'Cash Management', orgId: 'org-1' },
  { id: 'ws-4', name: 'Main Treasury', orgId: 'org-2' },
  { id: 'ws-5', name: 'Corporate Finance', orgId: 'org-3' },
];

export const OrgSwitcher = () => {
  const [selectedOrg, setSelectedOrg] = useState<Organization>(
    organizations[0]!
  );
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace>(
    workspaces[0]!
  );

  const orgWorkspaces = workspaces.filter((ws) => ws.orgId === selectedOrg.id);

  const handleOrgSelect = (org: Organization) => {
    setSelectedOrg(org);
    const firstWorkspace = workspaces.find((ws) => ws.orgId === org.id);
    if (firstWorkspace) {
      setSelectedWorkspace(firstWorkspace);
    }
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
              <div className="flex size-8 items-center justify-center bg-neutral-900 text-xs font-semibold text-white">
                {selectedOrg.initials}
              </div>
              <div className="flex flex-1 flex-col text-left">
                <span className="text-xs font-medium text-neutral-500">
                  {selectedOrg.name}
                </span>
                <span className="text-sm font-semibold text-neutral-900">
                  {selectedWorkspace.name}
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
            {/* Organizations */}
            <DropdownMenuLabel className="px-3 py-2 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
              Organization
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleOrgSelect(org)}
                  className="cursor-pointer rounded-none px-3 py-2"
                >
                  <div className="flex size-6 items-center justify-center bg-neutral-100 text-[10px] font-semibold text-neutral-700">
                    {org.initials}
                  </div>
                  <span className="flex-1 text-sm">{org.name}</span>
                  {selectedOrg.id === org.id && (
                    <CheckIcon className="size-4 text-neutral-900" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="my-0" />

            {/* Workspaces */}
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

            {/* Actions */}
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer rounded-none px-3 py-2 text-neutral-600">
                <PlusIcon className="size-4" />
                <span className="text-sm">Create Workspace</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
