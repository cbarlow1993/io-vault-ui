import { SignUp as ClerkSignUp, useAuth } from '@clerk/tanstack-react-start';
import { useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';

import { Spinner } from '@/components/ui/spinner';

import { AUTH_SIGNUP_ENABLED } from '@/features/auth/config';

/**
 * Sign-up page - Clerk only mode.
 * Uses Clerk's SignUp component for registration.
 */
export default function PageSignUp() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.navigate({ to: '/overview', replace: true });
    }
  }, [isLoaded, isSignedIn, router]);

  // Redirect if sign-up is disabled
  useEffect(() => {
    if (!AUTH_SIGNUP_ENABLED) {
      router.navigate({ to: '/login', replace: true });
    }
  }, [router]);

  // Show loading while checking auth
  if (!isLoaded) {
    return <Spinner full className="opacity-60" />;
  }

  // Don't render SignUp if already signed in (will redirect via useEffect)
  if (isSignedIn) {
    return <Spinner full className="opacity-60" />;
  }

  return (
    <ClerkSignUp routing="hash" afterSignUpUrl="/overview" signInUrl="/login" />
  );
}
