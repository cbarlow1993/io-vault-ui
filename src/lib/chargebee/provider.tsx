'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { envClient } from '@/env/client';

// Chargebee.js type declarations
declare global {
  interface Window {
    Chargebee?: ChargebeeStatic;
  }
}

interface ChargebeeStatic {
  init(options: ChargebeeInitOptions): ChargebeeInstance;
  getInstance(): ChargebeeInstance | undefined;
}

interface ChargebeeInitOptions {
  site: string;
  publishableKey: string;
}

interface ChargebeeInstance {
  createToken(
    element: ChargebeeCardElement | CardData,
    callbacks?: TokenCallbacks
  ): Promise<TokenResult>;
  load(componentType: 'components'): Promise<ChargebeeComponents>;
}

interface ChargebeeComponents {
  create(type: 'card', options?: CardOptions): ChargebeeCardElement;
}

interface ChargebeeCardElement {
  mount(selector: string | HTMLElement): void;
  unmount(): void;
  on(event: string, callback: (data: unknown) => void): void;
  focus(): void;
  blur(): void;
  clear(): void;
}

interface CardOptions {
  style?: {
    base?: Record<string, string>;
    invalid?: Record<string, string>;
    focus?: Record<string, string>;
  };
  placeholder?: {
    number?: string;
    expiry?: string;
    cvv?: string;
  };
  fonts?: Array<{ src: string; family: string }>;
}

interface TokenCallbacks {
  success?: (token: string) => void;
  error?: (error: ChargebeeError) => void;
}

interface TokenResult {
  token: string;
  vaultToken?: string;
}

interface ChargebeeError {
  message: string;
  code?: string;
  type?: string;
}

/**
 * Card data for tokenization without using Chargebee elements
 */
export interface CardData {
  number: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Context value for Chargebee provider
 */
interface ChargebeeContextValue {
  /** Chargebee instance, available when ready */
  instance: ChargebeeInstance | null;
  /** Whether Chargebee.js is loading */
  isLoading: boolean;
  /** Whether Chargebee is ready to use */
  isReady: boolean;
  /** Error that occurred during initialization */
  error: Error | null;
  /** Whether billing is enabled */
  isEnabled: boolean;
  /** Create a Chargebee card element */
  createCardElement: (options?: CardOptions) => Promise<ChargebeeCardElement>;
  /** Tokenize card data directly (without using elements) */
  tokenize: (cardData: CardData) => Promise<TokenResult>;
}

const ChargebeeContext = createContext<ChargebeeContextValue | null>(null);

const CHARGEBEE_SCRIPT_URL = 'https://js.chargebee.com/v2/chargebee.js';
const SCRIPT_ID = 'chargebee-js';

/**
 * Load Chargebee.js script dynamically
 */
function loadChargebeeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if (document.getElementById(SCRIPT_ID)) {
      if (window.Chargebee) {
        resolve();
      } else {
        // Script tag exists but Chargebee not loaded yet - wait for it
        const existingScript = document.getElementById(
          SCRIPT_ID
        ) as HTMLScriptElement;
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () =>
          reject(new Error('Failed to load Chargebee.js'))
        );
      }
      return;
    }

    // Create and append script
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = CHARGEBEE_SCRIPT_URL;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Chargebee.js'));

    document.head.appendChild(script);
  });
}

interface ChargebeeProviderProps {
  children: ReactNode;
}

/**
 * Chargebee provider for client-side card tokenization.
 * Only loads Chargebee.js when billing is enabled via VITE_ENABLE_CHARGEBEE_BILLING.
 *
 * @example
 * // In your providers
 * import { ChargebeeProvider } from '@/lib/chargebee';
 *
 * export function Providers({ children }) {
 *   return (
 *     <ChargebeeProvider>
 *       {children}
 *     </ChargebeeProvider>
 *   );
 * }
 */
export function ChargebeeProvider({ children }: ChargebeeProviderProps) {
  const [instance, setInstance] = useState<ChargebeeInstance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isEnabled = envClient.VITE_ENABLE_CHARGEBEE_BILLING;
  const site = envClient.VITE_CHARGEBEE_SITE;
  const publishableKey = envClient.VITE_CHARGEBEE_PUBLISHABLE_KEY;

  useEffect(() => {
    // Skip if billing is disabled or already initialized
    if (!isEnabled || instance) return;

    // Validate required config
    if (!site || !publishableKey) {
      setError(
        new Error(
          'Chargebee billing is enabled but VITE_CHARGEBEE_SITE and VITE_CHARGEBEE_PUBLISHABLE_KEY are required'
        )
      );
      return;
    }

    let mounted = true;

    async function initialize() {
      setIsLoading(true);
      setError(null);

      try {
        await loadChargebeeScript();

        if (!mounted) return;

        if (!window.Chargebee) {
          throw new Error('Chargebee.js loaded but Chargebee object not found');
        }

        // site and publishableKey are guaranteed to be defined here due to the guard above
        const cbInstance = window.Chargebee.init({
          site: site!,
          publishableKey: publishableKey!,
        });

        if (mounted) {
          setInstance(cbInstance);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err
              : new Error('Failed to initialize Chargebee')
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [isEnabled, site, publishableKey, instance]);

  const createCardElement = useCallback(
    async (options?: CardOptions): Promise<ChargebeeCardElement> => {
      if (!instance) {
        throw new Error('Chargebee is not initialized');
      }

      const components = await instance.load('components');
      return components.create('card', options);
    },
    [instance]
  );

  const tokenize = useCallback(
    async (cardData: CardData): Promise<TokenResult> => {
      if (!instance) {
        throw new Error('Chargebee is not initialized');
      }

      return instance.createToken(cardData);
    },
    [instance]
  );

  const contextValue: ChargebeeContextValue = {
    instance,
    isLoading,
    isReady: isEnabled && !!instance && !error,
    error,
    isEnabled,
    createCardElement,
    tokenize,
  };

  return (
    <ChargebeeContext.Provider value={contextValue}>
      {children}
    </ChargebeeContext.Provider>
  );
}

/**
 * Hook to access Chargebee context.
 * Must be used within ChargebeeProvider.
 *
 * @example
 * const { isReady, isLoading, error, tokenize } = useChargebeeContext();
 *
 * if (!isReady) return <LoadingSpinner />;
 *
 * const result = await tokenize({ number: '...', ... });
 */
export function useChargebeeContext(): ChargebeeContextValue {
  const context = useContext(ChargebeeContext);
  if (!context) {
    throw new Error(
      'useChargebeeContext must be used within ChargebeeProvider'
    );
  }
  return context;
}

// Re-export types for external use
export type {
  ChargebeeInstance,
  ChargebeeCardElement,
  CardOptions,
  TokenResult,
  ChargebeeError,
};
