import type { ClassificationType, ClassificationDirection, ParsedTransfer } from '@/src/services/transaction-processor/types.js';
import { TokenAmount } from '@/src/domain/value-objects/index.js';
import { TransactionClassification } from '@/src/domain/entities/index.js';

/**
 * Formats a raw token amount using decimals.
 * Removes trailing zeros and unnecessary decimal points.
 *
 * @param rawAmount - The raw amount as a string (e.g., "800000000000000")
 * @param decimals - The number of decimals (e.g., 18 for ETH)
 * @returns Formatted amount string (e.g., "0.0008")
 */
export function formatAmount(rawAmount: string, decimals: number): string {
  if (!rawAmount || rawAmount === '0') return '0';
  return TokenAmount.fromRaw(rawAmount, decimals).formatted;
}

/**
 * Generates a human-readable label for a classified transaction.
 *
 * @param type - The classification type
 * @param direction - The direction from the user's perspective
 * @param transfers - Parsed transfers to extract token info
 * @returns A human-readable label
 */
export function generateLabel(
  type: ClassificationType,
  direction: ClassificationDirection,
  transfers: ParsedTransfer[]
): string {
  const primaryTransfer = transfers[0];
  const rawAmount = primaryTransfer?.amount ?? '';
  const decimals = primaryTransfer?.token?.decimals ?? 18;
  const symbol = primaryTransfer?.token?.symbol ?? 'tokens';

  const formattedAmount = rawAmount ? formatAmount(rawAmount, decimals) : '';
  const amountWithSymbol = formattedAmount ? `${formattedAmount} ${symbol}` : symbol;

  // Delegate label generation to domain entity
  return TransactionClassification.generateLabel(type, direction, amountWithSymbol);
}
