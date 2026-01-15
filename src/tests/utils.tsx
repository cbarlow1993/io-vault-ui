import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { userEvent } from '@vitest/browser/context';
import { ThemeProvider } from 'next-themes';
import { ReactElement } from 'react';
import { ComponentRenderOptions, render } from 'vitest-browser-react';
import '@/lib/dayjs/config';

/**
 * Test-specific providers that exclude AuthProvider (ClerkProvider)
 * because Clerk requires RouterProvider context which isn't available
 * in isolated component tests.
 *
 * This is intentional - component tests focus on UI behavior,
 * not auth integration (which is covered by E2E tests).
 */
const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider
      attribute="class"
      storageKey="theme"
      disableTransitionOnChange
    >
      <QueryClientProvider client={testQueryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
};

const WithProviders = ({ children }: { children: React.ReactNode }) => {
  return <TestProviders>{children}</TestProviders>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<ComponentRenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: WithProviders, ...options });
};

// Custom Render
// https://testing-library.com/docs/react-testing-library/setup#custom-render
export * from '@vitest/browser/context';
export * from 'vitest-browser-react';

export { customRender as render };
export const setupUser = () => userEvent.setup();

export const FAILED_CLICK_TIMEOUT_MS = 200;
