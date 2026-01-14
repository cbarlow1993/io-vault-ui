'use client';

import { ClerkProvider } from '@clerk/tanstack-react-start';
import { createContext, type ReactNode, use } from 'react';

import type { AuthMode } from '@/lib/auth/types';

import { envClient } from '@/env/client';

interface AuthContextValue {
  mode: AuthMode;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Hook to access auth context.
 */
export function useAuthContext(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider that wraps the application.
 * Automatically selects Clerk or better-auth based on VITE_AUTH_MODE.
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
  const mode = (envClient.VITE_AUTH_MODE ?? 'better-auth') as AuthMode;

  const contextValue: AuthContextValue = {
    mode,
  };

  // Clerk mode - wrap with ClerkProvider
  if (mode === 'clerk') {
    const publishableKey = envClient.VITE_CLERK_PUBLISHABLE_KEY;

    if (!publishableKey) {
      console.error('VITE_CLERK_PUBLISHABLE_KEY is required for Clerk mode');
      return <AuthContext value={contextValue}>{children}</AuthContext>;
    }

    return (
      <ClerkProvider publishableKey={publishableKey}>
        <AuthContext value={contextValue}>{children}</AuthContext>
      </ClerkProvider>
    );
  }

  // Better-auth mode - no wrapper needed, just provide context
  return <AuthContext value={contextValue}>{children}</AuthContext>;
}
