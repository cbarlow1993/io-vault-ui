import { useAuth } from '@clerk/tanstack-react-start';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { clearSessionCache } from '@/hooks/use-session';

import { PageError } from '@/components/errors/page-error';
import { Spinner } from '@/components/ui/spinner';

/**
 * Logout page - Clerk only mode.
 * Signs the user out using Clerk and redirects to home.
 */
export const PageLogout = () => {
  const navigate = useNavigate();
  const { isLoaded: clerkLoaded, signOut: clerkSignOut } = useAuth();
  const hasTriggered = useRef(false);

  const { mutate, error } = useMutation({
    mutationKey: ['logout'],
    mutationFn: async () => {
      await clerkSignOut();
      clearSessionCache();
    },
    onSuccess: () => {
      navigate({
        to: '/',
        replace: true,
      });
    },
  });

  useEffect(() => {
    // Only trigger once and ensure Clerk is loaded
    if (hasTriggered.current) return;
    if (!clerkLoaded) return;

    hasTriggered.current = true;
    mutate();
  }, [clerkLoaded, mutate]);

  if (error) {
    return <PageError type="unknown-auth-error" />;
  }

  return <Spinner full />;
};
