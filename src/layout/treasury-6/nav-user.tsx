import { Link } from '@tanstack/react-router';
import {
  ChevronsUpDownIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
  UserIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const NavUser = () => {
  const { theme, setTheme } = useTheme();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <SidebarFooter className="border-t border-neutral-200 p-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="h-10 rounded-none px-2 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-0 hover:bg-neutral-50"
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center bg-neutral-900 text-xs font-medium text-white">
                        JD
                      </div>
                      <div className="flex flex-1 flex-col text-left group-data-[collapsible=icon]:hidden">
                        <span className="text-sm font-medium text-neutral-900">
                          J. Doe
                        </span>
                      </div>
                      <ChevronsUpDownIcon className="size-4 text-neutral-400 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="rounded-none">
                    J. Doe
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent
              className="w-48 rounded-none border-neutral-200 shadow-lg"
              side="top"
              align="start"
              sideOffset={8}
            >
              <DropdownMenuGroup>
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer rounded-none"
                >
                  <Link to="/settings" className="flex items-center gap-2">
                    <UserIcon className="size-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="cursor-pointer rounded-none"
                >
                  {theme === 'dark' ? (
                    <>
                      <SunIcon className="size-4" />
                      <span>Light</span>
                    </>
                  ) : (
                    <>
                      <MoonIcon className="size-4" />
                      <span>Dark</span>
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer rounded-none text-neutral-600">
                <LogOutIcon className="size-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
};
