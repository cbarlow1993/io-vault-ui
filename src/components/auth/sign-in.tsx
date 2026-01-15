'use client';

import { SignIn as ClerkSignIn } from '@clerk/tanstack-react-start';

import { cn } from '@/lib/tailwind/utils';

interface SignInProps {
  /** URL to redirect to after successful sign-in */
  redirectUrl?: string;
  /** Whether to show sign-up link */
  showSignUpLink?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Sign-in component using Clerk.
 *
 * @example
 * // Basic usage
 * <SignIn redirectUrl="/dashboard" />
 *
 * @example
 * // Without sign-up link
 * <SignIn showSignUpLink={false} />
 */
export function SignIn({
  redirectUrl = '/',
  showSignUpLink = true,
  className,
}: SignInProps) {
  return (
    <div className={cn(className)}>
      <ClerkSignIn
        routing="hash"
        afterSignInUrl={redirectUrl}
        signUpUrl={showSignUpLink ? '/sign-up' : undefined}
      />
    </div>
  );
}
