import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { cn } from '@/lib/tailwind/utils';
import { useSession } from '@/hooks/use-session';

import { authClient } from '@/features/auth/client';
import { AUTH_EMAIL_OTP_EXPIRATION_IN_MINUTES } from '@/features/auth/config';
import {
  FormFieldsLoginVerify,
  zFormFieldsLoginVerify,
} from '@/features/auth/schema';
import { LoginEmailOtpHint } from '@/features/devtools/login-hint';

export default function PageLoginVerify({
  search,
}: {
  search: { redirect?: string; email: string };
}) {
  const { t } = useTranslation(['auth', 'common']);
  const { refetch } = useSession();
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const form = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(zFormFieldsLoginVerify()),
    defaultValues: {
      otp: '',
    },
  });

  const submitHandler: SubmitHandler<FormFieldsLoginVerify> = async ({
    otp,
  }) => {
    const { error } = await authClient.signIn.emailOtp({
      email: search.email,
      otp,
    });

    if (error) {
      toast.error(
        error.code
          ? t(
              `auth:errorCode.${error.code as unknown as keyof typeof authClient.$ERROR_CODES}`
            )
          : error.message || t('auth:errorCode.UNKNOWN_ERROR')
      );
      form.setError('otp', {
        message: t('auth:common.otp.invalid'),
      });
      return;
    }

    // Refetch session to update guards and redirect
    refetch();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newValues = [...otpValues];
    newValues[index] = value.slice(-1);
    setOtpValues(newValues);

    const otp = newValues.join('');
    form.setValue('otp', otp);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (otp.length === 6) {
      form.handleSubmit(submitHandler)();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newValues = [...otpValues];
    const pastedChars = [...pastedData];
    for (let i = 0; i < pastedChars.length; i++) {
      newValues[i] = pastedChars[i] ?? '';
    }
    setOtpValues(newValues);
    form.setValue('otp', newValues.join(''));

    if (pastedData.length === 6) {
      form.handleSubmit(submitHandler)();
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="flex flex-col gap-8">
      {/* Back link */}
      <Link
        to="/login"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeftIcon className="size-4" />
        Back to sign in
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Verify your email
        </h1>
        <p className="text-sm text-neutral-500">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-neutral-700">{search.email}</span>
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={form.handleSubmit(submitHandler)}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium tracking-wider text-neutral-500 uppercase">
            Verification Code
          </label>
          <div className="flex gap-2">
            {otpValues.map((value, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={value}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                autoFocus={index === 0}
                disabled={isSubmitting}
                className={cn(
                  'h-12 w-12 border bg-neutral-50 text-center text-lg font-medium text-neutral-900 transition-colors outline-none',
                  'focus:border-neutral-400 focus:bg-white',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  form.formState.errors.otp
                    ? 'border-negative-500'
                    : 'border-neutral-200'
                )}
              />
            ))}
          </div>
          {form.formState.errors.otp && (
            <p className="text-xs text-negative-600">
              {form.formState.errors.otp.message}
            </p>
          )}
          <p className="text-xs text-neutral-400">
            Code expires in {AUTH_EMAIL_OTP_EXPIRATION_IN_MINUTES} minutes
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || otpValues.join('').length !== 6}
          className={cn(
            'h-11 w-full bg-brand-500 text-sm font-medium text-white transition-colors',
            'hover:bg-brand-600',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {isSubmitting ? 'Verifying...' : 'Verify'}
        </button>

        <LoginEmailOtpHint />
      </form>
    </div>
  );
}
