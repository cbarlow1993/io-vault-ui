import { SignIn as ClerkSignIn, useAuth } from '@clerk/tanstack-react-start';
import { useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';

import { Spinner } from '@/components/ui/spinner';

import { AUTH_SIGNUP_ENABLED } from '@/features/auth/config';

/**
 * Login page - Clerk only mode.
 * Uses Clerk's SignIn component for authentication.
 */
export default function PageLogin({
  search,
}: {
  search: { redirect?: string };
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.navigate({ to: search.redirect ?? '/', replace: true });
    }
  }, [isLoaded, isSignedIn, router, search.redirect]);

  // Show loading while checking auth
  if (!isLoaded) {
    return <Spinner full className="opacity-60" />;
  }

  // Don't render SignIn if already signed in (will redirect via useEffect)
  if (isSignedIn) {
    return <Spinner full className="opacity-60" />;
  }

  return (
    <ClerkSignIn
      routing="hash"
      afterSignInUrl={search.redirect ?? '/'}
      signUpUrl={AUTH_SIGNUP_ENABLED ? '/sign-up' : undefined}
    />
  );
}
