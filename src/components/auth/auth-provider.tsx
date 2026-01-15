'use client';

import { ClerkProvider } from '@clerk/tanstack-react-start';
import { type ReactNode } from 'react';

import { clerkAppearance } from '@/lib/clerk/appearance';

import { envClient } from '@/env/client';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider that wraps the application with Clerk.
 *
 * @example
 * // In your root layout
 * import { AuthProvider } from '@/components/auth/auth-provider';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <AuthProvider>
 *       {children}
 *     </AuthProvider>
 *   );
 * }
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const publishableKey = envClient.VITE_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    console.error('VITE_CLERK_PUBLISHABLE_KEY is required');
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} appearance={clerkAppearance}>
      {children}
    </ClerkProvider>
  );
}
