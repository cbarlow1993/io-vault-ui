import { useUser } from '@clerk/tanstack-react-start';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2Icon, ShieldCheckIcon } from 'lucide-react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { cn } from '@/lib/tailwind/utils';
import { useSession } from '@/hooks/use-session';

import { AccountLayout } from './components/account-layout';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function PageAccountSecurity() {
  const { data: session, isPending } = useSession();
  const { user: clerkUser } = useUser();

  const form = useForm<PasswordFormData>({
    mode: 'onSubmit',
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      if (!clerkUser) {
        throw new Error('User not found');
      }
      await clerkUser.updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit: SubmitHandler<PasswordFormData> = (data) => {
    changePasswordMutation.mutate(data);
  };

  if (isPending) {
    return (
      <AccountLayout
        title="Security"
        description="Manage your password and security settings"
      >
        <div className="flex h-64 items-center justify-center">
          <Loader2Icon className="size-6 animate-spin text-neutral-400" />
        </div>
      </AccountLayout>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <AccountLayout
      title="Security"
      description="Manage your password and security settings"
    >
      <div className="space-y-8">
        {/* Password Section */}
        <div className="border border-neutral-200">
          <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Change Password
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Update your password to keep your account secure
            </p>
          </div>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6">
            <div className="max-w-md space-y-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="currentPassword"
                  className="text-xs font-medium text-neutral-700"
                >
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter your current password"
                  className={cn(
                    'h-10 w-full border bg-white px-3 text-sm text-neutral-900 transition-colors outline-none',
                    'placeholder:text-neutral-400',
                    'focus:border-neutral-400',
                    form.formState.errors.currentPassword
                      ? 'border-negative-500'
                      : 'border-neutral-200'
                  )}
                  {...form.register('currentPassword')}
                />
                {form.formState.errors.currentPassword && (
                  <p className="text-xs text-negative-600">
                    {form.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="newPassword"
                  className="text-xs font-medium text-neutral-700"
                >
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  placeholder="Enter your new password"
                  className={cn(
                    'h-10 w-full border bg-white px-3 text-sm text-neutral-900 transition-colors outline-none',
                    'placeholder:text-neutral-400',
                    'focus:border-neutral-400',
                    form.formState.errors.newPassword
                      ? 'border-negative-500'
                      : 'border-neutral-200'
                  )}
                  {...form.register('newPassword')}
                />
                {form.formState.errors.newPassword && (
                  <p className="text-xs text-negative-600">
                    {form.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="text-xs font-medium text-neutral-700"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  className={cn(
                    'h-10 w-full border bg-white px-3 text-sm text-neutral-900 transition-colors outline-none',
                    'placeholder:text-neutral-400',
                    'focus:border-neutral-400',
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className={cn(
                    'h-8 bg-brand-500 px-4 text-xs font-medium text-white transition-colors',
                    'hover:bg-brand-600',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  {changePasswordMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2Icon className="size-3.5 animate-spin" />
                      Changing...
                    </span>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Security Tips */}
        <div className="border border-neutral-200">
          <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Security Tips
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Best practices to keep your account secure
            </p>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-positive-600" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    Use a strong password
                  </p>
                  <p className="text-xs text-neutral-500">
                    Combine uppercase letters, lowercase letters, numbers, and
                    symbols
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-positive-600" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    Don't reuse passwords
                  </p>
                  <p className="text-xs text-neutral-500">
                    Use a unique password for each of your accounts
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-positive-600" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    Enable two-factor authentication
                  </p>
                  <p className="text-xs text-neutral-500">
                    Add an extra layer of security to your account
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}
