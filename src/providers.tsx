import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import '@/lib/dayjs/config';
import '@/lib/i18n';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/inter';
import '@fontsource-variable/outfit';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/space-grotesk';

import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';

import { QueryClientProvider } from '@/lib/tanstack-query/provider';

import { AuthProvider } from '@/components/auth/auth-provider';
import { Sonner } from '@/components/ui/sonner';

import { envClient } from '@/env/client';
import {
  DemoModeDrawer,
  useIsDemoModeDrawerVisible,
} from '@/features/demo/demo-mode-drawer';

export const Providers = (props: { children: ReactNode }) => {
  const isDemoModeDrawerVisible = useIsDemoModeDrawerVisible();
  return (
    <ThemeProvider
      attribute="class"
      storageKey="theme"
      disableTransitionOnChange
    >
      <AuthProvider>
        <QueryClientProvider>
          {props.children}
          {!isDemoModeDrawerVisible && <Sonner />}
          {envClient.VITE_IS_DEMO && <DemoModeDrawer />}
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
