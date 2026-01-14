import { useAuth } from '@clerk/tanstack-react-start';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { clearSessionCache } from '@/hooks/use-session';

import { PageError } from '@/components/errors/page-error';
import { Spinner } from '@/components/ui/spinner';

import { envClient } from '@/env/client';
import { authClient } from '@/features/auth/client';

export const PageLogout = () => {
  const navigate = useNavigate();
  const authMode = envClient.VITE_AUTH_MODE ?? 'better-auth';
  const { isLoaded: clerkLoaded, signOut: clerkSignOut } = useAuth();
  const hasTriggered = useRef(false);

  const { mutate, error } = useMutation({
    mutationKey: ['logout'],
    mutationFn: async () => {
      if (authMode === 'clerk') {
        await clerkSignOut();
      } else {
        const response = await authClient.signOut();
        if (response.error) {
          throw response.error;
        }
      }
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
    // Only trigger once and ensure Clerk is loaded in Clerk mode
    if (hasTriggered.current) return;

    if (authMode === 'clerk' && !clerkLoaded) {
      return;
    }

    hasTriggered.current = true;
    mutate();
  }, [authMode, clerkLoaded, mutate]);

  if (error) {
    return <PageError type="unknown-auth-error" />;
  }

  return <Spinner full />;
};
