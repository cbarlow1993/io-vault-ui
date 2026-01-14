import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, CheckCircleIcon } from 'lucide-react';
import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';

import { forgetPassword } from '@/lib/auth/better-auth-client';
import { cn } from '@/lib/tailwind/utils';

import { envClient } from '@/env/client';

const zForgotPassword = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordForm = z.infer<typeof zForgotPassword>;

export default function PageForgotPassword() {
  const { t } = useTranslation(['auth', 'common']);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const form = useForm<ForgotPasswordForm>({
    mode: 'onSubmit',
    resolver: zodResolver(zForgotPassword),
    defaultValues: {
      email: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (email: string) => {
      const authMode = envClient.VITE_AUTH_MODE ?? 'better-auth';

      if (authMode === 'clerk') {
        // Clerk handles password reset through its hosted pages
        // Redirect to Clerk's forgot password flow
        throw new Error('Please use the Clerk password reset flow');
      }

      // better-auth mode
      const result = await forgetPassword(email);
      if (result.error) {
        throw new Error(result.error.message || 'Failed to send reset email');
      }
      return result;
    },
    onSuccess: (_, email) => {
      setSubmittedEmail(email);
      setIsSuccess(true);
    },
    onError: (error) => {
      // Don't reveal if email exists or not for security
      // Still show success to prevent email enumeration
      setSubmittedEmail(form.getValues('email'));
      setIsSuccess(true);
    },
  });

  const submitHandler: SubmitHandler<ForgotPasswordForm> = async ({
    email,
  }) => {
    mutation.mutate(email);
  };

  const isSubmitting = form.formState.isSubmitting || mutation.isPending;

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-8">
        {/* Success state */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-positive-50">
            <CheckCircleIcon className="size-8 text-positive-600" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Check your email
            </h1>
            <p className="text-sm text-neutral-500">
              We sent a password reset link to{' '}
              <span className="font-medium text-neutral-700">
                {submittedEmail}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-center text-sm text-neutral-500">
          <p>Didn't receive the email? Check your spam folder or</p>
          <button
            type="button"
            onClick={() => {
              setIsSuccess(false);
              form.reset();
            }}
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            try another email address
          </button>
        </div>

        <Link
          to="/login"
          className={cn(
            'flex h-11 w-full items-center justify-center gap-2 border border-neutral-200 bg-white text-sm font-medium text-neutral-700 transition-colors',
            'hover:bg-neutral-50'
          )}
        >
          <ArrowLeftIcon className="size-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Forgot password?
        </h1>
        <p className="text-sm text-neutral-500">
          No worries, we'll send you reset instructions.
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
          {isSubmitting ? 'Sending...' : 'Reset password'}
        </button>
      </form>

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
