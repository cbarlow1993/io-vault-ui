import type { ClassificationType, ClassificationDirection, ParsedTransfer } from '@/src/services/transaction-processor/types.js';
import { TransactionClassification } from '@/src/domain/entities/index.js';

/**
 * Calculates the direction of a transaction from the perspective of a specific address.
 *
 * @param type - The classification type of the transaction
 * @param transfers - Parsed transfers from the transaction
 * @param perspectiveAddress - The address to calculate direction from
 * @returns The direction: 'in', 'out', or 'neutral'
 */
export function calculateDirection(
  type: ClassificationType,
  transfers: ParsedTransfer[],
  perspectiveAddress: string
): ClassificationDirection {
  const addr = perspectiveAddress.toLowerCase();

  // Count transfers relative to perspective address
  const incomingCount = transfers.filter((t) => t.to?.toLowerCase() === addr).length;
  const outgoingCount = transfers.filter((t) => t.from?.toLowerCase() === addr).length;

  // Delegate to domain entity for classification logic
  return TransactionClassification.computeDirection(type, incomingCount, outgoingCount);
}
