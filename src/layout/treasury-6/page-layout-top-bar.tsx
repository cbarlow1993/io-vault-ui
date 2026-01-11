import type { ReactNode } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Breadcrumbs, type BreadcrumbItem } from './breadcrumbs';
import { NotificationButton } from './notifications';

// Internal component for the actions slot with divider and notification button
const ActionsSlot = ({ actions }: { actions?: ReactNode }) => {
  return (
    <div className="flex items-center gap-3">
      {actions}
      {actions && <div className="h-4 w-px bg-neutral-200" />}
      <NotificationButton />
    </div>
  );
};

type PageLayoutTopBarProps = {
  // Declarative API
  breadcrumbs?: BreadcrumbItem[];
  showHomeIcon?: boolean;
  title?: string;
  subtitle?: string;
  status?: ReactNode;
  actions?: ReactNode;

  // Legacy/escape hatch API
  children?: ReactNode;
  endActions?: ReactNode;

  className?: string;
};

export const PageLayoutTopBar = ({
  breadcrumbs,
  showHomeIcon,
  title,
  subtitle,
  status,
  actions,
  children,
  endActions,
  className,
}: PageLayoutTopBarProps) => {
  // Determine if using new declarative API or legacy children API
  const useDeclarativeApi = !children && (breadcrumbs || title);

  // Determine end actions:
  // - `actions` prop uses ActionsSlot (auto divider + NotificationButton) - works with both APIs
  // - `endActions` prop is legacy escape hatch (manual handling)
  const endContent = actions ? (
    <ActionsSlot actions={actions} />
  ) : endActions ? (
    <div className="flex items-center gap-3">{endActions}</div>
  ) : useDeclarativeApi ? (
    <ActionsSlot />
  ) : null;

  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5',
        className
      )}
    >
      <div className="flex items-center gap-4">
        {useDeclarativeApi ? (
          <div className="flex flex-col justify-center gap-0.5">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <Breadcrumbs items={breadcrumbs} showHomeIcon={showHomeIcon} />
            )}
            <div className="flex items-center gap-2">
              {title && <PageLayoutTopBarTitle>{title}</PageLayoutTopBarTitle>}
              {status}
            </div>
            {subtitle && (
              <span className="text-xs text-neutral-400">{subtitle}</span>
            )}
          </div>
        ) : (
          children
        )}
      </div>
      {endContent}
    </header>
  );
};

export const PageLayoutTopBarTitle = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => {
  return (
    <h1
      className={cn(
        'text-sm font-semibold tracking-tight text-neutral-900',
        className
      )}
    >
      {children}
    </h1>
  );
};
