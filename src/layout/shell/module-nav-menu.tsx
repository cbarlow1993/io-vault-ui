import { Link, useRouterState } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';
import { useState } from 'react';

import type { NavItem } from '@/lib/modules';
import { useModule } from '@/lib/modules';
import { cn } from '@/lib/tailwind/utils';

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
                        className="data-[active=true]:border-module-accent h-9 rounded-none border-l-2 border-transparent px-3 text-sm font-medium text-neutral-500 transition-all hover:border-neutral-300 hover:bg-transparent hover:text-neutral-900 data-[active=true]:bg-transparent data-[active=true]:text-neutral-900"
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
                            <child.icon
                              className="size-3.5"
                              strokeWidth={1.5}
                            />
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
                      className="data-[active=true]:border-module-accent h-9 rounded-none border-l-2 border-transparent px-3 text-sm font-medium text-neutral-500 transition-all hover:border-neutral-300 hover:bg-transparent hover:text-neutral-900 data-[active=true]:bg-transparent data-[active=true]:text-neutral-900"
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
