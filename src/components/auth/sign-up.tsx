'use client';

import { SignUp as ClerkSignUp } from '@clerk/tanstack-react-start';

import { cn } from '@/lib/tailwind/utils';

interface SignUpProps {
  /** URL to redirect to after successful sign-up */
  redirectUrl?: string;
  /** Whether to show sign-in link */
  showSignInLink?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Sign-up component using Clerk.
 *
 * @example
 * // Basic usage
 * <SignUp redirectUrl="/onboarding" />
 *
 * @example
 * // Without sign-in link
 * <SignUp showSignInLink={false} />
 */
export function SignUp({
  redirectUrl = '/',
  showSignInLink = true,
  className,
}: SignUpProps) {
  return (
    <div className={cn(className)}>
      <ClerkSignUp
        routing="hash"
        afterSignUpUrl={redirectUrl}
        signInUrl={showSignInLink ? '/login' : undefined}
      />
    </div>
  );
}
