import { Link, useRouterState } from '@tanstack/react-router';
import {
  ArrowRightLeftIcon,
  BookUserIcon,
  ChevronRightIcon,
  FingerprintIcon,
  GridIcon,
  KeyIcon,
  ListChecksIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { LogoIofinnet } from '@/assets/logo-iofinnet';

import { NavUser } from './nav-user';
import { OrgSwitcher } from './org-switcher';

type NavItem = {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  url?: string;
  children?: {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  }[];
};

const navItems: NavItem[] = [
  { title: 'Overview', icon: GridIcon, url: '/overview' },
  {
    title: 'Vaults',
    icon: KeyIcon,
    children: [
      { title: 'Vaults', url: '/vaults', icon: KeyIcon },
      { title: 'Signers', url: '/signers', icon: FingerprintIcon },
    ],
  },
  {
    title: 'Policies',
    icon: ShieldCheckIcon,
    children: [
      {
        title: 'Whitelists',
        url: '/policies/whitelists',
        icon: ListChecksIcon,
      },
      {
        title: 'Transactions',
        url: '/policies/transactions',
        icon: ArrowRightLeftIcon,
      },
    ],
  },
  { title: 'Identities', icon: UsersIcon, url: '/identities' },
  { title: 'Address Book', icon: BookUserIcon, url: '/address-book' },
  { title: 'Settings', icon: SettingsIcon, url: '/settings' },
];

const NavMenu = () => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Track expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    // Auto-expand sections that contain active items
    const initial = new Set<string>();
    for (const item of navItems) {
      if (item.children) {
        const hasActiveChild = item.children.some((child) =>
          pathname.startsWith(child.url)
        );
        if (hasActiveChild) {
          initial.add(item.title);
        }
      }
    }
    return initial;
  });

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  // Check if nav item is active - use startsWith for items with sub-pages
  const isNavItemActive = (itemUrl: string) => {
    // For items with sub-pages (settings, identities, vaults, signers, address-book, policies)
    if (
      itemUrl === '/settings' ||
      itemUrl === '/identities' ||
      itemUrl === '/vaults' ||
      itemUrl === '/signers' ||
      itemUrl === '/address-book' ||
      itemUrl === '/policies/whitelists' ||
      itemUrl === '/policies/transactions'
    ) {
      return pathname.startsWith(itemUrl);
    }
    // For exact match items
    return pathname === itemUrl;
  };

  // Check if a parent section has any active children
  const hasActiveChild = (item: NavItem) => {
    if (!item.children) return false;
    return item.children.some((child) => isNavItemActive(child.url));
  };

  return (
    <SidebarContent className="px-2 pt-2">
      <SidebarMenu className="space-y-0.5">
        {navItems.map((item) => (
          <SidebarMenuItem key={item.title}>
            {item.children ? (
              // Expandable section
              <>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        onClick={() => toggleSection(item.title)}
                        isActive={hasActiveChild(item)}
                        className="h-9 rounded-none border-l-2 border-transparent px-3 text-sm font-medium text-neutral-500 transition-all hover:border-neutral-300 hover:bg-transparent hover:text-neutral-900 data-[active=true]:border-neutral-900 data-[active=true]:bg-transparent data-[active=true]:text-neutral-900"
                      >
                        <item.icon className="size-4" strokeWidth={1.5} />
                        <span className="flex-1">{item.title}</span>
                        <ChevronRightIcon
                          className={cn(
                            'size-3.5 text-neutral-400 transition-transform duration-200',
                            expandedSections.has(item.title) && 'rotate-90'
                          )}
                        />
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right" className="rounded-none">
                        {item.title}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

                {/* Sub-menu items */}
                {expandedSections.has(item.title) && (
                  <SidebarMenuSub className="mt-0.5 ml-4 border-l-0 px-0">
                    {item.children.map((child) => (
                      <SidebarMenuSubItem key={child.url}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={isNavItemActive(child.url)}
                          className={cn(
                            'h-8 rounded-none border-l-2 border-transparent px-3 text-sm font-medium text-neutral-500 transition-all hover:border-neutral-300 hover:bg-transparent hover:text-neutral-900',
                            isNavItemActive(child.url) &&
                              'border-neutral-900 bg-transparent text-neutral-900'
                          )}
                        >
                          <Link to={child.url}>
                            <child.icon
                              className="size-3.5"
                              strokeWidth={1.5}
                            />
                            <span>{child.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </>
            ) : (
              // Regular nav item
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      asChild
                      isActive={isNavItemActive(item.url!)}
                      className="h-9 rounded-none border-l-2 border-transparent px-3 text-sm font-medium text-neutral-500 transition-all hover:border-neutral-300 hover:bg-transparent hover:text-neutral-900 data-[active=true]:border-neutral-900 data-[active=true]:bg-transparent data-[active=true]:text-neutral-900"
                    >
                      <Link to={item.url!}>
                        <item.icon className="size-4" strokeWidth={1.5} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right" className="rounded-none">
                      {item.title}
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
};

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

export const NavSidebar = (props: { children?: ReactNode }) => {
  return (
    <SidebarProvider>
      <Sidebar
        collapsible="icon"
        className="border-r border-neutral-200 bg-white font-inter"
      >
        <SidebarHeader className="p-0">
          <SidebarToggle />
          <div className="border-b border-neutral-200 px-3 py-3 group-data-[collapsible=icon]:hidden group-data-[state=collapsed]:hidden">
            <OrgSwitcher />
          </div>
        </SidebarHeader>
        <NavMenu />
        <NavUser />
        <SidebarRail />
      </Sidebar>
      <SidebarInset>{props.children}</SidebarInset>
    </SidebarProvider>
  );
};
