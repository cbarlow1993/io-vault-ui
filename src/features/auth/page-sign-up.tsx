import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { ArrowLeftIcon, CheckIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';
import { cn } from '@/lib/tailwind/utils';
import { useSession } from '@/hooks/use-session';

import { authClient } from '@/features/auth/client';
import { AUTH_EMAIL_OTP_EXPIRATION_IN_MINUTES } from '@/features/auth/config';
import {
  FormFieldsLogin,
  FormFieldsSignUpOrganization,
  zFormFieldsLogin,
  zFormFieldsLoginVerify,
  zFormFieldsSignUpOrganization,
} from '@/features/auth/schema';

type Step = 1 | 2 | 3;

const STEPS = [
  { number: 1, label: 'Email' },
  { number: 2, label: 'Verify' },
  { number: 3, label: 'Organization' },
] as const;

export default function PageSignUp() {
  const { t } = useTranslation(['auth', 'common']);
  const router = useRouter();
  const { refetch } = useSession();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Submit onboarding mutation
  const submitOnboarding = useMutation(
    orpc.account.submitOnboarding.mutationOptions({
      onSuccess: async () => {
        await refetch();
        router.navigate({ to: '/overview' });
      },
      onError: () => {
        toast.error(t('auth:errorCode.UNKNOWN_ERROR'));
      },
    })
  );

  // Step 1: Email form
  const emailForm = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(zFormFieldsLogin()),
    defaultValues: {
      email: '',
    },
  });

  // Step 2: OTP form
  const otpForm = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(zFormFieldsLoginVerify()),
    defaultValues: {
      otp: '',
    },
  });

  // Step 3: Organization form
  const orgForm = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(zFormFieldsSignUpOrganization()),
    defaultValues: {
      organizationName: '',
    },
  });

  // Step 1: Submit email
  const handleEmailSubmit: SubmitHandler<FormFieldsLogin> = async (data) => {
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: data.email,
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

      setEmail(data.email);
      setCurrentStep(2);
    } catch {
      toast.error(t('auth:errorCode.UNKNOWN_ERROR'));
    }
  };

  // Step 2: Verify OTP
  const handleOtpSubmit = async (otp: string) => {
    try {
      const { error } = await authClient.signIn.emailOtp({
        email,
        otp,
      });

      if (error) {
        toast.error(t('auth:common.otp.invalid'));
        otpForm.setError('otp', { message: t('auth:common.otp.invalid') });
        return;
      }

      // Check if user needs onboarding (new user)
      await refetch();
      setCurrentStep(3);
    } catch {
      toast.error(t('auth:errorCode.UNKNOWN_ERROR'));
    }
  };

  // Step 3: Set organization name and complete onboarding
  const handleOrgSubmit: SubmitHandler<FormFieldsSignUpOrganization> = (
    data
  ) => {
    submitOnboarding.mutate({ name: data.organizationName });
  };

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newValues = [...otpValues];
    newValues[index] = value.slice(-1);
    setOtpValues(newValues);

    const otp = newValues.join('');
    otpForm.setValue('otp', otp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (otp.length === 6) {
      handleOtpSubmit(otp);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newValues = [...otpValues];
    const pastedChars = [...pastedData];
    for (let i = 0; i < pastedChars.length; i++) {
      newValues[i] = pastedChars[i] ?? '';
    }
    setOtpValues(newValues);
    otpForm.setValue('otp', newValues.join(''));

    if (pastedData.length === 6) {
      handleOtpSubmit(newValues.join(''));
    }
  };

  const isSubmitting =
    emailForm.formState.isSubmitting ||
    otpForm.formState.isSubmitting ||
    orgForm.formState.isSubmitting ||
    submitOnboarding.isPending;

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
          Create your account
        </h1>
        <p className="text-sm text-neutral-500">
          {currentStep === 1 && 'Enter your email to get started'}
          {currentStep === 2 && 'Verify your email address'}
          {currentStep === 3 && 'Set up your organization'}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div
              className={cn(
                'flex size-8 items-center justify-center text-sm font-medium transition-colors',
                currentStep > step.number
                  ? 'bg-brand-500 text-white'
                  : currentStep === step.number
                    ? 'border-2 border-brand-500 text-brand-500'
                    : 'border border-neutral-200 text-neutral-400'
              )}
            >
              {currentStep > step.number ? (
                <CheckIcon className="size-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={cn(
                'ml-2 text-xs font-medium',
                currentStep >= step.number
                  ? 'text-neutral-900'
                  : 'text-neutral-400'
              )}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-3 h-px w-8',
                  currentStep > step.number ? 'bg-brand-500' : 'bg-neutral-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Email form */}
      {currentStep === 1 && (
        <form
          onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
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
              autoFocus
              className={cn(
                'h-11 w-full border bg-neutral-50 px-4 text-sm text-neutral-900 transition-colors outline-none',
                'placeholder:text-neutral-400',
                'focus:border-neutral-400 focus:bg-white',
                emailForm.formState.errors.email
                  ? 'border-negative-500'
                  : 'border-neutral-200'
              )}
              {...emailForm.register('email')}
            />
            {emailForm.formState.errors.email && (
              <p className="text-xs text-negative-600">
                {emailForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'mt-2 h-11 w-full bg-brand-500 text-sm font-medium text-white transition-colors',
              'hover:bg-brand-600',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {isSubmitting ? 'Sending code...' : 'Continue'}
          </button>
        </form>
      )}

      {/* Step 2: OTP verification */}
      {currentStep === 2 && (
        <form
          onSubmit={otpForm.handleSubmit(() =>
            handleOtpSubmit(otpValues.join(''))
          )}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-600">
              We sent a 6-digit code to{' '}
              <span className="font-medium text-neutral-900">{email}</span>
            </p>
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
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  autoFocus={index === 0}
                  disabled={isSubmitting}
                  className={cn(
                    'h-12 w-12 border bg-neutral-50 text-center text-lg font-medium text-neutral-900 transition-colors outline-none',
                    'focus:border-neutral-400 focus:bg-white',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    otpForm.formState.errors.otp
                      ? 'border-negative-500'
                      : 'border-neutral-200'
                  )}
                />
              ))}
            </div>
            {otpForm.formState.errors.otp && (
              <p className="text-xs text-negative-600">
                {otpForm.formState.errors.otp.message}
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
        </form>
      )}

      {/* Step 3: Organization */}
      {currentStep === 3 && (
        <form
          onSubmit={orgForm.handleSubmit(handleOrgSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="organizationName"
              className="text-xs font-medium tracking-wider text-neutral-500 uppercase"
            >
              Organization Name
            </label>
            <input
              id="organizationName"
              type="text"
              autoComplete="organization"
              placeholder="Your company or team name"
              autoFocus
              className={cn(
                'h-11 w-full border bg-neutral-50 px-4 text-sm text-neutral-900 transition-colors outline-none',
                'placeholder:text-neutral-400',
                'focus:border-neutral-400 focus:bg-white',
                orgForm.formState.errors.organizationName
                  ? 'border-negative-500'
                  : 'border-neutral-200'
              )}
              {...orgForm.register('organizationName')}
            />
            {orgForm.formState.errors.organizationName && (
              <p className="text-xs text-negative-600">
                {orgForm.formState.errors.organizationName.message}
              </p>
            )}
            <p className="text-xs text-neutral-400">
              You can change this later in settings
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'mt-2 h-11 w-full bg-brand-500 text-sm font-medium text-white transition-colors',
              'hover:bg-brand-600',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {isSubmitting ? 'Creating organization...' : 'Get Started'}
          </button>
        </form>
      )}

      {/* Sign in link */}
      {currentStep === 1 && (
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
