import { useUser } from '@clerk/tanstack-react-start';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2Icon } from 'lucide-react';
import { useEffect } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { cn } from '@/lib/tailwind/utils';
import { clearSessionCache, useSession } from '@/hooks/use-session';

import { AccountLayout } from './components/account-layout';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email address'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function PageAccountProfile() {
  const { data: session, isPending } = useSession();
  const { user: clerkUser } = useUser();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormData>({
    mode: 'onSubmit',
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  // Update form with session data when available
  useEffect(() => {
    if (session?.user) {
      form.reset({
        name: session.user.name || '',
        email: session.user.email || '',
      });
    }
  }, [session, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!clerkUser) {
        throw new Error('User not found');
      }
      await clerkUser.update({
        firstName: data.name.split(' ')[0] || data.name,
        lastName: data.name.split(' ').slice(1).join(' ') || undefined,
      });
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      clearSessionCache();
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit: SubmitHandler<ProfileFormData> = (data) => {
    updateProfileMutation.mutate(data);
  };

  if (isPending) {
    return (
      <AccountLayout
        title="Profile"
        description="Manage your personal information"
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

  const user = session.user;
  const initials = getInitials(user.name || user.email);

  return (
    <AccountLayout
      title="Profile"
      description="Manage your personal information"
    >
      <div className="space-y-8">
        {/* Avatar Section */}
        <div className="border border-neutral-200">
          <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
            <h2 className="text-sm font-semibold text-neutral-900">Avatar</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Your profile picture across the platform
            </p>
          </div>
          <div className="flex items-center gap-6 p-6">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || ''}
                className="size-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full bg-brand-500 text-2xl font-medium text-white">
                {initials}
              </div>
            )}
            <div className="text-sm text-neutral-500">
              <p>Upload a new avatar or use your social account picture.</p>
              <p className="mt-1 text-xs text-neutral-400">
                Recommended size: 200x200px
              </p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="border border-neutral-200">
          <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Personal Information
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Update your name and email address
            </p>
          </div>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6">
            <div className="max-w-md space-y-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="name"
                  className="text-xs font-medium text-neutral-700"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  className={cn(
                    'h-10 w-full border bg-white px-3 text-sm text-neutral-900 transition-colors outline-none',
                    'placeholder:text-neutral-400',
                    'focus:border-neutral-400',
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
                  className="text-xs font-medium text-neutral-700"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  disabled
                  className={cn(
                    'h-10 w-full border bg-neutral-50 px-3 text-sm text-neutral-500 transition-colors outline-none',
                    'cursor-not-allowed border-neutral-200'
                  )}
                  {...form.register('email')}
                />
                <p className="text-xs text-neutral-400">
                  Email address cannot be changed
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={
                    updateProfileMutation.isPending || !form.formState.isDirty
                  }
                  className={cn(
                    'h-8 bg-brand-500 px-4 text-xs font-medium text-white transition-colors',
                    'hover:bg-brand-600',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  {updateProfileMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2Icon className="size-3.5 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AccountLayout>
  );
}

function getInitials(name: string): string {
  const parts = name.split(/[\s@]+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1] && parts[0][0] && parts[1][0]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
