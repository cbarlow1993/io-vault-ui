import type { ClassificationType, ClassificationDirection, ParsedTransfer } from '@/src/services/transaction-processor/types.js';

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

  // Type-based overrides (no transfer analysis needed)
  if (type === 'swap' || type === 'approve' || type === 'contract_deploy' || type === 'unknown') {
    return 'neutral';
  }

  if (type === 'mint') return 'in';
  if (type === 'burn') return 'out';

  // For stake, transfer, nft_transfer, bridge: analyze transfers
  const incoming = transfers.filter((t) => t.to?.toLowerCase() === addr);
  const outgoing = transfers.filter((t) => t.from?.toLowerCase() === addr);

  if (incoming.length > 0 && outgoing.length === 0) return 'in';
  if (outgoing.length > 0 && incoming.length === 0) return 'out';

  // Mixed or no transfers
  return 'neutral';
}
