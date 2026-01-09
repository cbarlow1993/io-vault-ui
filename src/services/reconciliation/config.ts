import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { ReorgThreshold } from '@/src/domain/value-objects/index.js';

/**
 * @deprecated Use ReorgThreshold.forChain() from domain layer instead
 */
export function getReorgThreshold(chainAlias: ChainAlias): number {
  return ReorgThreshold.forChain(chainAlias);
}

/**
 * @deprecated Use ReorgThreshold from domain layer
 */
export const CHAIN_ALIAS_REORG_THRESHOLDS = {} as const;

/**
 * Rate limiting configuration for reconciliation worker.
 */
export const RECONCILIATION_RATE_LIMIT = {
  tokensPerInterval: 1,
  interval: 'second' as const,
};
