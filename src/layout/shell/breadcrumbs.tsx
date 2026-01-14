import { Link } from '@tanstack/react-router';
import { ChevronRightIcon, HomeIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  showHomeIcon?: boolean;
  className?: string;
};

export const Breadcrumbs = ({
  items,
  showHomeIcon = false,
  className,
}: BreadcrumbsProps) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1', className)}
    >
      {items.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === items.length - 1;
        const showIcon = isFirst && showHomeIcon;

        return (
          <div key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRightIcon className="size-3 text-neutral-400" />
            )}
            {isLast || !item.href ? (
              <span
                className={cn(
                  'max-w-[200px] truncate text-xs',
                  isLast ? 'font-medium text-neutral-900' : 'text-neutral-500'
                )}
              >
                {showIcon && (
                  <HomeIcon className="mr-1 inline size-3 align-text-bottom" />
                )}
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="flex max-w-[200px] items-center truncate text-xs text-neutral-500 hover:text-neutral-900 hover:underline"
              >
                {showIcon && <HomeIcon className="mr-1 size-3" />}
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};
