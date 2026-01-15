import { useAuth, useClerk } from '@clerk/tanstack-react-start';
import { Link, useRouter } from '@tanstack/react-router';
import { ArrowLeftIcon, KeyIcon, Loader2Icon } from 'lucide-react';
import { useEffect } from 'react';

import { cn } from '@/lib/tailwind/utils';

/**
 * Forgot password page - Clerk mode.
 *
 * In Clerk mode, password reset is handled through Clerk's hosted pages.
 * This page provides a link to initiate the password reset flow.
 */
export default function PageForgotPassword() {
  const { isLoaded, isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const router = useRouter();

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.navigate({ to: '/treasury/overview', replace: true });
    }
  }, [isLoaded, isSignedIn, router]);

  const handleResetPassword = () => {
    // Open Clerk's sign-in modal which has a "Forgot password?" link
    openSignIn({
      afterSignInUrl: '/overview',
      afterSignUpUrl: '/overview',
    });
  };

  if (!isLoaded) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-brand-50">
          <KeyIcon className="size-8 text-brand-600" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Forgot password?
          </h1>
          <p className="text-sm text-neutral-500">
            No worries, we'll help you reset it.
          </p>
        </div>
      </div>

      {/* Action */}
      <div className="flex flex-col gap-4">
        <p className="text-center text-sm text-neutral-600">
          Click the button below to open the sign-in dialog where you can
          request a password reset.
        </p>

        <button
          type="button"
          onClick={handleResetPassword}
          className={cn(
            'h-11 w-full bg-brand-500 text-sm font-medium text-white transition-colors',
            'hover:bg-brand-600'
          )}
        >
          Reset Password
        </button>
      </div>

      {/* Back to login */}
      <Link
        to="/login"
        className="flex items-center justify-center gap-2 text-sm text-neutral-500 hover:text-neutral-700"
      >
        <ArrowLeftIcon className="size-4" />
        Back to sign in
      </Link>
    </div>
  );
}
