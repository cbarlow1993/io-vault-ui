import { SignIn as ClerkSignIn, useAuth } from '@clerk/tanstack-react-start';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { GithubIcon } from 'lucide-react';
import { useEffect } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { cn } from '@/lib/tailwind/utils';

import { Spinner } from '@/components/ui/spinner';

import { envClient } from '@/env/client';
import { authClient } from '@/features/auth/client';
import { AUTH_SIGNUP_ENABLED } from '@/features/auth/config';
import { FormFieldsLogin, zFormFieldsLogin } from '@/features/auth/schema';
import { LoginEmailHint } from '@/features/devtools/login-hint';

const I18N_KEY_PAGE_PREFIX = AUTH_SIGNUP_ENABLED
  ? ('auth:pageLoginWithSignUp' as const)
  : ('auth:pageLogin' as const);

export default function PageLogin({
  search,
}: {
  search: { redirect?: string };
}) {
  const authMode = envClient.VITE_AUTH_MODE ?? 'better-auth';

  // Clerk mode - use Clerk's SignIn component
  if (authMode === 'clerk') {
    return <ClerkLoginPage search={search} />;
  }

  // Better-auth mode - use existing email OTP flow
  return <BetterAuthLoginForm search={search} />;
}

function ClerkLoginPage({ search }: { search: { redirect?: string } }) {
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

function BetterAuthLoginForm({ search }: { search: { redirect?: string } }) {
  const { t } = useTranslation(['auth', 'common']);
  const router = useRouter();

  const social = useMutation({
    mutationFn: async (
      provider: Parameters<typeof authClient.signIn.social>[0]['provider']
    ) => {
      try {
        const response = await authClient.signIn.social({
          provider,
          callbackURL: search.redirect ?? '/',
          errorCallbackURL: '/login/error',
        });
        if (response.error) {
          throw new Error(response.error.message);
        }
        return response.data;
      } catch {
        toast.error(t('auth:errorCode.UNKNOWN_ERROR'));
      }
    },
    onError: (error) => {
      form.setError('email', { message: error.message });
      toast.error(error.message);
    },
  });

  const form = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(zFormFieldsLogin()),
    defaultValues: {
      email: '',
    },
  });

  const submitHandler: SubmitHandler<FormFieldsLogin> = async ({ email }) => {
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'sign-in',
      });

      if (error) {
        toast.error(
          error.code
            ? t(
                `auth:errorCode.${error.code as unknown as keyof typeof authClient.$ERROR_CODES}`
              )
            : error.message || t('auth:errorCode.UNKNOWN_ERROR')
        );
        return;
      }

      router.navigate({
        replace: true,
        to: '/login/verify',
        search: {
          redirect: search.redirect,
          email,
        },
      });
    } catch {
      toast.error(t('auth:errorCode.UNKNOWN_ERROR'));
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Welcome back
        </h1>
        <p className="text-sm text-neutral-500">
          Enter your email to sign in to your account
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={form.handleSubmit(submitHandler)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-xs font-medium tracking-wider text-neutral-500 uppercase"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            className={cn(
              'h-11 w-full border bg-neutral-50 px-4 text-sm text-neutral-900 transition-colors outline-none',
              'placeholder:text-neutral-400',
              'focus:border-neutral-400 focus:bg-white',
              form.formState.errors.email
                ? 'border-negative-500'
                : 'border-neutral-200'
            )}
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-negative-600">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'h-11 w-full bg-brand-500 text-sm font-medium text-white transition-colors',
            'hover:bg-brand-600',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in with Email'}
        </button>

        <LoginEmailHint />
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs tracking-wider text-neutral-400 uppercase">
            or continue with
          </span>
        </div>
      </div>

      {/* Social Login */}
      <button
        type="button"
        disabled={
          envClient.VITE_IS_DEMO || social.isPending || social.isSuccess
        }
        onClick={() => social.mutate('github')}
        className={cn(
          'flex h-11 w-full items-center justify-center gap-2 border border-neutral-200 bg-white text-sm font-medium text-neutral-700 transition-colors',
          'hover:bg-neutral-50',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        <GithubIcon className="size-4" />
        {social.isPending ? 'Connecting...' : 'GitHub'}
      </button>

      {/* Sign up link */}
      {AUTH_SIGNUP_ENABLED && (
        <p className="text-center text-sm text-neutral-500">
          Don't have an account?{' '}
          <Link
            to="/sign-up"
            className="font-medium text-neutral-900 hover:underline"
          >
            Sign up
          </Link>
        </p>
      )}
    </div>
  );
}
