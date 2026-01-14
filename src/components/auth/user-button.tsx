'use client';

import { UserButton as ClerkUserButton } from '@clerk/tanstack-react-start';
import { useRouter } from '@tanstack/react-router';
import {
  ChevronDownIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { betterAuthClient } from '@/lib/auth/better-auth-client';
import { cn } from '@/lib/tailwind/utils';
import { clearSessionCache, useSession } from '@/hooks/use-session';

import { envClient } from '@/env/client';

interface UserButtonProps {
  /** Show user name next to avatar */
  showName?: boolean;
  /** Custom class name */
  className?: string;
  /** URL to navigate to after sign out */
  afterSignOutUrl?: string;
}

/**
 * User menu button that works with both Clerk and better-auth.
 * Shows user avatar with dropdown menu for account actions.
 *
 * @example
 * // Basic usage
 * <UserButton />
 *
 * @example
 * // With name displayed
 * <UserButton showName />
 */
export function UserButton({
  showName = false,
  className,
  afterSignOutUrl = '/login',
}: UserButtonProps) {
  const authMode = envClient.VITE_AUTH_MODE ?? 'better-auth';

  // Clerk mode - use Clerk's UserButton component
  if (authMode === 'clerk') {
    return (
      <div className={className}>
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

  // Better-auth mode - use custom component
  return (
    <BetterAuthUserButton
      showName={showName}
      className={className}
      afterSignOutUrl={afterSignOutUrl}
    />
  );
}

function BetterAuthUserButton({
  showName,
  className,
  afterSignOutUrl,
}: UserButtonProps) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await betterAuthClient.signOut();
      clearSessionCache();
      toast.success('Signed out successfully');
      router.navigate({ to: afterSignOutUrl || '/login' });
    } catch {
      toast.error('Failed to sign out');
    } finally {
      setIsSigningOut(false);
      setIsOpen(false);
    }
  };

  if (isPending) {
    return (
      <div
        className={cn(
          'size-8 animate-pulse rounded-full bg-neutral-200',
          className
        )}
      />
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const initials = getInitials(user.name || user.email);

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-full transition-colors',
          'hover:bg-neutral-100',
          showName ? 'py-1 pr-2 pl-1' : 'p-0.5'
        )}
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name || ''}
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-full bg-brand-500 text-xs font-medium text-white">
            {initials}
          </div>
        )}
        {showName && (
          <>
            <span className="text-sm font-medium text-neutral-700">
              {user.name || user.email}
            </span>
            <ChevronDownIcon
              className={cn(
                'size-4 text-neutral-400 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          {/* User info */}
          <div className="border-b border-neutral-100 px-4 py-3">
            <p className="text-sm font-medium text-neutral-900">
              {user.name || 'User'}
            </p>
            <p className="text-xs text-neutral-500">{user.email}</p>
          </div>

          {/* Menu items */}
          <div className="p-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.navigate({ to: '/account' });
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-700 transition-colors',
                'hover:bg-neutral-100'
              )}
            >
              <UserIcon className="size-4" />
              Profile
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.navigate({ to: '/settings' });
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-700 transition-colors',
                'hover:bg-neutral-100'
              )}
            >
              <SettingsIcon className="size-4" />
              Settings
            </button>
          </div>

          {/* Sign out */}
          <div className="border-t border-neutral-100 p-1">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-negative-600 transition-colors',
                'hover:bg-negative-50',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <LogOutIcon className="size-4" />
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.split(/[\s@]+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1] && parts[0][0] && parts[1][0]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
