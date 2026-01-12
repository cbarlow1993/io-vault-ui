/**
 * Chargebee.js client integration for PCI-compliant card tokenization.
 *
 * @example
 * // Setup in providers
 * import { ChargebeeProvider } from '@/lib/chargebee';
 *
 * function Providers({ children }) {
 *   return (
 *     <ChargebeeProvider>
 *       {children}
 *     </ChargebeeProvider>
 *   );
 * }
 *
 * @example
 * // Use in payment form
 * import { useChargebee } from '@/lib/chargebee';
 *
 * function PaymentForm() {
 *   const { isReady, tokenize, isTokenizing } = useChargebee();
 *
 *   const handleSubmit = async () => {
 *     const result = await tokenize({
 *       number: '4111111111111111',
 *       expiry_month: '12',
 *       expiry_year: '2025',
 *       cvv: '123',
 *     });
 *
 *     if (result) {
 *       // Send token to backend
 *       await api.billing.createPaymentMethod(result.token);
 *     }
 *   };
 * }
 */

export { ChargebeeProvider, useChargebeeContext } from './provider';

export type {
  CardData,
  ChargebeeInstance,
  ChargebeeCardElement,
  CardOptions,
  TokenResult,
  ChargebeeError,
} from './provider';

export { useChargebee } from './use-chargebee';
