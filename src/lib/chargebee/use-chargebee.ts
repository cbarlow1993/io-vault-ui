import { useCallback, useState } from 'react';

import {
  useChargebeeContext,
  type CardData,
  type ChargebeeCardElement,
  type CardOptions,
  type TokenResult,
  type ChargebeeError,
} from './provider';

/**
 * Result type for tokenization hook
 */
interface UseChargebeeResult {
  /** Whether Chargebee billing is enabled */
  isEnabled: boolean;
  /** Whether Chargebee is ready to use */
  isReady: boolean;
  /** Whether Chargebee.js is still loading */
  isLoading: boolean;
  /** Initialization error, if any */
  error: Error | null;
  /** Whether a tokenization is in progress */
  isTokenizing: boolean;
  /** Error from the last tokenization attempt */
  tokenizeError: ChargebeeError | null;
  /** Tokenize card data and return a payment token */
  tokenize: (cardData: CardData) => Promise<TokenResult | null>;
  /** Create a Chargebee card element for embedded forms */
  createCardElement: (options?: CardOptions) => Promise<ChargebeeCardElement>;
  /** Tokenize using a Chargebee card element */
  tokenizeElement: (
    element: ChargebeeCardElement
  ) => Promise<TokenResult | null>;
  /** Clear the last tokenization error */
  clearTokenizeError: () => void;
}

/**
 * Hook for Chargebee card tokenization.
 * Provides convenient methods for tokenizing card data in a PCI-compliant way.
 *
 * @example
 * // Using direct card data tokenization
 * function PaymentForm() {
 *   const { isReady, isTokenizing, tokenizeError, tokenize } = useChargebee();
 *
 *   async function handleSubmit(cardData: CardData) {
 *     const result = await tokenize(cardData);
 *     if (result) {
 *       // Send result.token to your backend
 *       await api.createPaymentMethod(result.token);
 *     }
 *   }
 *
 *   if (!isReady) return <LoadingState />;
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {tokenizeError && <ErrorMessage error={tokenizeError} />}
 *       ...
 *     </form>
 *   );
 * }
 *
 * @example
 * // Using Chargebee card element
 * function CardElementForm() {
 *   const { isReady, createCardElement, tokenizeElement } = useChargebee();
 *   const [cardElement, setCardElement] = useState<ChargebeeCardElement | null>(null);
 *
 *   useEffect(() => {
 *     if (!isReady) return;
 *
 *     async function setupCard() {
 *       const element = await createCardElement();
 *       element.mount('#card-element');
 *       setCardElement(element);
 *     }
 *
 *     setupCard();
 *
 *     return () => cardElement?.unmount();
 *   }, [isReady, createCardElement]);
 *
 *   async function handleSubmit() {
 *     if (!cardElement) return;
 *     const result = await tokenizeElement(cardElement);
 *     if (result) {
 *       await api.createPaymentMethod(result.token);
 *     }
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <div id="card-element" />
 *       <button type="submit">Submit</button>
 *     </form>
 *   );
 * }
 */
export function useChargebee(): UseChargebeeResult {
  const context = useChargebeeContext();
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [tokenizeError, setTokenizeError] = useState<ChargebeeError | null>(
    null
  );

  const tokenize = useCallback(
    async (cardData: CardData): Promise<TokenResult | null> => {
      if (!context.isReady) {
        setTokenizeError({
          message: 'Chargebee is not ready',
          code: 'NOT_READY',
        });
        return null;
      }

      setIsTokenizing(true);
      setTokenizeError(null);

      try {
        const result = await context.tokenize(cardData);
        return result;
      } catch (err) {
        const chargebeeError: ChargebeeError =
          err && typeof err === 'object' && 'message' in err
            ? (err as ChargebeeError)
            : { message: 'Tokenization failed', code: 'UNKNOWN' };
        setTokenizeError(chargebeeError);
        return null;
      } finally {
        setIsTokenizing(false);
      }
    },
    [context]
  );

  const tokenizeElement = useCallback(
    async (element: ChargebeeCardElement): Promise<TokenResult | null> => {
      if (!context.instance) {
        setTokenizeError({
          message: 'Chargebee is not ready',
          code: 'NOT_READY',
        });
        return null;
      }

      setIsTokenizing(true);
      setTokenizeError(null);

      try {
        const result = await context.instance.createToken(element);
        return result;
      } catch (err) {
        const chargebeeError: ChargebeeError =
          err && typeof err === 'object' && 'message' in err
            ? (err as ChargebeeError)
            : { message: 'Tokenization failed', code: 'UNKNOWN' };
        setTokenizeError(chargebeeError);
        return null;
      } finally {
        setIsTokenizing(false);
      }
    },
    [context.instance]
  );

  const clearTokenizeError = useCallback(() => {
    setTokenizeError(null);
  }, []);

  return {
    isEnabled: context.isEnabled,
    isReady: context.isReady,
    isLoading: context.isLoading,
    error: context.error,
    isTokenizing,
    tokenizeError,
    tokenize,
    createCardElement: context.createCardElement,
    tokenizeElement,
    clearTokenizeError,
  };
}
