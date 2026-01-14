import { Link, useNavigate } from '@tanstack/react-router';
import {
  ChevronsUpDownIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
  UserIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';

import { useSession } from '@/hooks/use-session';

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
  const { data: session } = useSession();
  const navigate = useNavigate();
  const isCollapsed = state === 'collapsed';

  const userName = session?.user.name || session?.user.email || 'User';
  const userInitials = getInitials(userName);

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
                        {userInitials}
                      </div>
                      <div className="flex flex-1 flex-col text-left group-data-[collapsible=icon]:hidden">
                        <span className="text-sm font-medium text-neutral-900">
                          {userName}
                        </span>
                      </div>
                      <ChevronsUpDownIcon className="size-4 text-neutral-400 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="rounded-none">
                    {userName}
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
                  <Link to="/account" className="flex items-center gap-2">
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
              <DropdownMenuItem
                onClick={() => navigate({ to: '/logout' })}
                className="cursor-pointer rounded-none text-neutral-600"
              >
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

function getInitials(name: string): string {
  const parts = name.split(/[\s@]+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1] && parts[0][0] && parts[1][0]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
