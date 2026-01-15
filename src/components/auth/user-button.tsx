'use client';

import { UserButton as ClerkUserButton } from '@clerk/tanstack-react-start';

import { cn } from '@/lib/tailwind/utils';

interface UserButtonProps {
  /** Show user name next to avatar */
  showName?: boolean;
  /** Custom class name */
  className?: string;
  /** URL to navigate to after sign out */
  afterSignOutUrl?: string;
}

/**
 * User menu button using Clerk.
 * Shows user avatar with dropdown menu for account actions.
 *
 * @example
 * // Basic usage
 * <UserButton />
 *
 * @example
 * // With custom redirect
 * <UserButton afterSignOutUrl="/" />
 */
export function UserButton({
  className,
  afterSignOutUrl = '/login',
}: UserButtonProps) {
  return (
    <div className={cn(className)}>
      <ClerkUserButton
        afterSignOutUrl={afterSignOutUrl}
        appearance={{
          elements: {
            avatarBox: 'size-8',
          },
        }}
      />
    </div>
  );
}
