import { Link, useRouterState } from '@tanstack/react-router';
import {
  ArchiveIcon,
  CreditCardIcon,
  KeyRoundIcon,
  LayoutGridIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  Users2Icon,
  UsersIcon,
} from 'lucide-react';
import { type ReactNode } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { envClient } from '@/env/client';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

const settingsNavItems = [
  { title: 'Members', icon: UsersIcon, url: '/settings/members' },
  { title: 'Teams', icon: Users2Icon, url: '/settings/teams' },
  { title: 'Roles', icon: KeyRoundIcon, url: '/settings/roles' },
  { title: 'Workspaces', icon: LayoutGridIcon, url: '/settings/workspaces' },
  { title: 'Backups', icon: ArchiveIcon, url: '/settings/backups' },
  { title: 'Governance', icon: ShieldCheckIcon, url: '/settings/governance' },
  { title: 'Audit Log', icon: ScrollTextIcon, url: '/settings/audit' },
  { title: 'Billing', icon: CreditCardIcon, url: '/settings/billing' },
].filter((item) => {
  // Hide billing when Chargebee billing is disabled
  if (item.url === '/settings/billing') {
    return envClient.VITE_ENABLE_CHARGEBEE_BILLING;
  }
  return true;
});

type SettingsLayoutProps = {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export const SettingsLayout = ({
  children,
  title,
  description,
  actions,
}: SettingsLayoutProps) => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <PageLayout>
      <PageLayoutTopBar title="Settings" />
      <PageLayoutContent containerClassName="py-0">
        <div className="flex min-h-[calc(100vh-48px)]">
          {/* Settings Sidebar */}
          <aside className="w-56 shrink-0 border-r border-neutral-200 bg-neutral-50 py-4">
            <nav className="space-y-1 px-3">
              {settingsNavItems.map((item) => {
                const isActive = pathname.startsWith(item.url);
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-neutral-600 hover:bg-white hover:text-neutral-900'
                    )}
                  >
                    <item.icon className="size-4" strokeWidth={1.5} />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 bg-white">
            {/* Content Header */}
            <div className="border-b border-neutral-200 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-neutral-900">
                    {title}
                  </h1>
                  {description && (
                    <p className="mt-1 text-sm text-neutral-500">
                      {description}
                    </p>
                  )}
                </div>
                {actions && (
                  <div className="flex items-center gap-3">{actions}</div>
                )}
              </div>
            </div>

            {/* Content Body */}
            <div className="px-8 py-6">{children}</div>
          </main>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
