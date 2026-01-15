// src/layout/shell/nav-sidebar.tsx
import { type ReactNode } from 'react';

import { useModule } from '@/lib/modules';

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
