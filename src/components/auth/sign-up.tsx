'use client';

import { SignUp as ClerkSignUp } from '@clerk/tanstack-react-start';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from '@tanstack/react-router';
import { GithubIcon, Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { cn } from '@/lib/tailwind/utils';

import { envClient } from '@/env/client';
import { authClient } from '@/features/auth/client';

const signUpSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

interface SignUpProps {
  /** URL to redirect to after successful sign-up */
  redirectUrl?: string;
  /** Whether to show sign-in link */
  showSignInLink?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Sign-up component that works with both Clerk and better-auth.
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
  const authMode = envClient.VITE_AUTH_MODE ?? 'better-auth';

  // Clerk mode - use Clerk's SignUp component
  if (authMode === 'clerk') {
    return (
      <div className={className}>
        <ClerkSignUp
          routing="hash"
          afterSignUpUrl={redirectUrl}
          signInUrl={showSignInLink ? '/login' : undefined}
        />
      </div>
    );
  }

  // Better-auth mode - use custom form
  return (
    <SignUpForm
      redirectUrl={redirectUrl}
      showSignInLink={showSignInLink}
      className={className}
    />
  );
}

function SignUpForm({ redirectUrl, showSignInLink, className }: SignUpProps) {
  const router = useRouter();
  const [socialLoading, setSocialLoading] = useState<
    'github' | 'google' | null
  >(null);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<SignUpFormData>({
    mode: 'onSubmit',
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const submitHandler: SubmitHandler<SignUpFormData> = async (data) => {
    const result = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: data.name,
    });

    if (result.error) {
      toast.error(result.error.message);
      form.setError('email', { message: result.error.message });
      return;
    }

    // If no session data, email verification is required
    if (!result.data) {
      setEmailSent(true);
      toast.success('Check your email to verify your account');
      return;
    }

    toast.success('Account created successfully');
    router.navigate({ to: redirectUrl || '/' });
  };

  const handleSocialSignIn = async (socialProvider: 'github' | 'google') => {
    setSocialLoading(socialProvider);

    const result = await authClient.signIn.social({
      provider: socialProvider,
      callbackURL: redirectUrl,
      errorCallbackURL: '/sign-up/error',
    });

    if (result.error) {
      toast.error(result.error.message);
      setSocialLoading(null);
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  // Show email verification message
  if (emailSent) {
    return (
      <div className={cn('flex flex-col gap-8', className)}>
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Check your email
          </h1>
          <p className="text-sm text-neutral-500">
            We sent a verification link to{' '}
            <strong>{form.getValues('email')}</strong>
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-center text-sm text-neutral-500">
            Click the link in your email to verify your account and sign in.
          </p>

          <button
            type="button"
            onClick={() => setEmailSent(false)}
            className={cn(
              'h-11 w-full border border-neutral-200 bg-white text-sm font-medium text-neutral-700 transition-colors',
              'hover:bg-neutral-50'
            )}
          >
            Back to sign up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Create an account
        </h1>
        <p className="text-sm text-neutral-500">
          Enter your details to create your account
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={form.handleSubmit(submitHandler)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="name"
            className="text-xs font-medium tracking-wider text-neutral-500 uppercase"
          >
            Full Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="John Doe"
            className={cn(
              'h-11 w-full border bg-neutral-50 px-4 text-sm text-neutral-900 transition-colors outline-none',
              'placeholder:text-neutral-400',
              'focus:border-neutral-400 focus:bg-white',
              form.formState.errors.name
                ? 'border-negative-500'
                : 'border-neutral-200'
            )}
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-negative-600">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

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

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-xs font-medium tracking-wider text-neutral-500 uppercase"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            className={cn(
              'h-11 w-full border bg-neutral-50 px-4 text-sm text-neutral-900 transition-colors outline-none',
              'placeholder:text-neutral-400',
              'focus:border-neutral-400 focus:bg-white',
              form.formState.errors.password
                ? 'border-negative-500'
                : 'border-neutral-200'
            )}
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-negative-600">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="confirmPassword"
            className="text-xs font-medium tracking-wider text-neutral-500 uppercase"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm your password"
            className={cn(
              'h-11 w-full border bg-neutral-50 px-4 text-sm text-neutral-900 transition-colors outline-none',
              'placeholder:text-neutral-400',
              'focus:border-neutral-400 focus:bg-white',
              form.formState.errors.confirmPassword
                ? 'border-negative-500'
                : 'border-neutral-200'
            )}
            {...form.register('confirmPassword')}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-xs text-negative-600">
              {form.formState.errors.confirmPassword.message}
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
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2Icon className="size-4 animate-spin" />
              Creating account...
            </span>
          ) : (
            'Create account'
          )}
        </button>
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
      <div className="flex gap-3">
        <button
          type="button"
          disabled={envClient.VITE_IS_DEMO || !!socialLoading}
          onClick={() => handleSocialSignIn('github')}
          className={cn(
            'flex h-11 flex-1 items-center justify-center gap-2 border border-neutral-200 bg-white text-sm font-medium text-neutral-700 transition-colors',
            'hover:bg-neutral-50',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {socialLoading === 'github' ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <GithubIcon className="size-4" />
          )}
          GitHub
        </button>

        <button
          type="button"
          disabled={envClient.VITE_IS_DEMO || !!socialLoading}
          onClick={() => handleSocialSignIn('google')}
          className={cn(
            'flex h-11 flex-1 items-center justify-center gap-2 border border-neutral-200 bg-white text-sm font-medium text-neutral-700 transition-colors',
            'hover:bg-neutral-50',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {socialLoading === 'google' ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <GoogleIcon className="size-4" />
          )}
          Google
        </button>
      </div>

      {/* Sign in link */}
      {showSignInLink && (
        <p className="text-center text-sm text-neutral-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-neutral-900 hover:underline"
          >
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
