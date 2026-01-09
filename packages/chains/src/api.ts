// packages/chains/src/api.ts

import type {
  ChainAlias,
  Ecosystem,
  EvmChainAlias,
  SvmChainAlias,
  TvmChainAlias,
  UtxoChainAlias,
  XrpChainAlias,
  SubstrateChainAlias,
  RawTransactionResult,
  RawEvmTransactionResult,
  RawSolanaTransactionResult,
  RawUtxoTransactionResult,
  RawTronTransactionResult,
  RawXrpTransactionResult,
  RawSubstrateTransactionResult,
} from './core/types.js';
import type {
  RawTransaction,
  RawEvmTransaction,
  RawSolanaTransaction,
  RawUtxoTransaction,
  RawTronTransaction,
  RawXrpTransaction,
  RawSubstrateTransaction,
} from './core/interfaces.js';
import { providerCache } from './core/provider-cache.js';
import { isValidChainAlias, getEcosystem } from './core/registry.js';
import { ChainError, UnsupportedChainError } from './core/errors.js';

// Ecosystem providers
import { EvmChainProvider } from './evm/provider.js';
import { getEvmChainConfig } from './evm/config.js';
import { SvmChainProvider } from './svm/provider.js';
import { getSvmChainConfig } from './svm/config.js';
import { TvmChainProvider } from './tvm/provider.js';
import { getTvmChainConfig } from './tvm/config.js';
import { UtxoChainProvider } from './utxo/provider.js';
import { getUtxoChainConfig } from './utxo/config.js';
import { XrpChainProvider } from './xrp/provider.js';
import { getXrpChainConfig } from './xrp/config.js';
import { SubstrateChainProvider } from './substrate/provider.js';
import { getSubstrateChainConfig } from './substrate/config.js';

// ============ Provider Types ============

/**
 * Union type of all chain providers
 */
export type ChainProvider =
  | EvmChainProvider
  | SvmChainProvider
  | TvmChainProvider
  | UtxoChainProvider
  | XrpChainProvider
  | SubstrateChainProvider;

// ============ Configuration ============

export interface ChainProviderConfig {
  rpcOverrides?: Partial<Record<ChainAlias, string>>;
}

let globalConfig: ChainProviderConfig = {};

/**
 * Configure global settings for chain providers
 */
export function configure(config: ChainProviderConfig): void {
  globalConfig = { ...globalConfig, ...config };
}

// ============ Provider Factory ============

/**
 * Get or create a chain provider for the specified chain.
 * Providers are cached for efficiency.
 *
 * @param chainAlias - The chain to get a provider for
 * @param rpcUrl - Optional RPC URL override
 * @returns A chain provider instance
 *
 * @example
 * ```typescript
 * const provider = getChainProvider('ethereum');
 * const balance = await provider.getNativeBalance('0x...');
 * ```
 */
export function getChainProvider(chainAlias: ChainAlias, rpcUrl?: string): ChainProvider {
  if (!isValidChainAlias(chainAlias)) {
    throw new UnsupportedChainError(chainAlias);
  }

  const ecosystem = getEcosystem(chainAlias);
  const overrideRpcUrl = rpcUrl ?? globalConfig.rpcOverrides?.[chainAlias];
  const effectiveRpcUrl = overrideRpcUrl ?? getDefaultRpcUrl(ecosystem, chainAlias);

  // Check cache first
  const cached = providerCache.get(chainAlias, effectiveRpcUrl);
  if (cached) {
    return cached as ChainProvider;
  }

  // Create provider based on ecosystem
  const provider = createProviderForEcosystem(ecosystem, chainAlias, overrideRpcUrl);

  // Cache the provider
  providerCache.set(chainAlias, effectiveRpcUrl, provider);

  return provider;
}

function getDefaultRpcUrl(ecosystem: Ecosystem, chainAlias: ChainAlias): string {
  switch (ecosystem) {
    case 'evm':
      return getEvmChainConfig(chainAlias as EvmChainAlias).rpcUrl;
    case 'svm':
      return getSvmChainConfig(chainAlias as SvmChainAlias).rpcUrl;
    case 'tvm':
      return getTvmChainConfig(chainAlias as TvmChainAlias).rpcUrl;
    case 'utxo':
      return getUtxoChainConfig(chainAlias as UtxoChainAlias).rpcUrl;
    case 'xrp':
      return getXrpChainConfig(chainAlias as XrpChainAlias).rpcUrl;
    case 'substrate':
      return getSubstrateChainConfig(chainAlias as SubstrateChainAlias).rpcUrl;
    default:
      throw new ChainError(`Unknown ecosystem: ${ecosystem}`, chainAlias);
  }
}

function createProviderForEcosystem(
  ecosystem: Ecosystem,
  chainAlias: ChainAlias,
  rpcUrl?: string
): ChainProvider {
  switch (ecosystem) {
    case 'evm':
      return new EvmChainProvider(chainAlias as EvmChainAlias, rpcUrl);
    case 'svm':
      return new SvmChainProvider(chainAlias as SvmChainAlias, rpcUrl);
    case 'tvm':
      return new TvmChainProvider(chainAlias as TvmChainAlias, rpcUrl);
    case 'utxo':
      return new UtxoChainProvider(chainAlias as UtxoChainAlias, rpcUrl);
    case 'xrp':
      return new XrpChainProvider(chainAlias as XrpChainAlias, rpcUrl);
    case 'substrate':
      return new SubstrateChainProvider(chainAlias as SubstrateChainAlias, rpcUrl);
    default:
      throw new ChainError(`Unknown ecosystem: ${ecosystem}`, chainAlias);
  }
}

// ============ Provider Type Guards ============

/**
 * Check if provider is an EVM provider
 */
export function isEvmProvider(provider: ChainProvider): provider is EvmChainProvider {
  return provider instanceof EvmChainProvider;
}

/**
 * Check if provider is a Solana provider
 */
export function isSvmProvider(provider: ChainProvider): provider is SvmChainProvider {
  return provider instanceof SvmChainProvider;
}

/**
 * Check if provider is a UTXO provider
 */
export function isUtxoProvider(provider: ChainProvider): provider is UtxoChainProvider {
  return provider instanceof UtxoChainProvider;
}

/**
 * Check if provider is a TVM provider
 */
export function isTvmProvider(provider: ChainProvider): provider is TvmChainProvider {
  return provider instanceof TvmChainProvider;
}

/**
 * Check if provider is an XRP provider
 */
export function isXrpProvider(provider: ChainProvider): provider is XrpChainProvider {
  return provider instanceof XrpChainProvider;
}

/**
 * Check if provider is a Substrate provider
 */
export function isSubstrateProvider(provider: ChainProvider): provider is SubstrateChainProvider {
  return provider instanceof SubstrateChainProvider;
}

// ============ Transaction Type Guards ============

/**
 * Check if a raw transaction is an EVM transaction
 */
export function isEvmTransaction(tx: RawTransaction): tx is RawEvmTransaction {
  return tx._chain === 'evm';
}

/**
 * Check if a raw transaction is a Solana transaction
 */
export function isSolanaTransaction(tx: RawTransaction): tx is RawSolanaTransaction {
  return tx._chain === 'svm';
}

/**
 * Check if a raw transaction is a UTXO transaction
 */
export function isUtxoTransaction(tx: RawTransaction): tx is RawUtxoTransaction {
  return tx._chain === 'utxo';
}

/**
 * Check if a raw transaction is a Tron transaction
 */
export function isTronTransaction(tx: RawTransaction): tx is RawTronTransaction {
  return tx._chain === 'tvm';
}

/**
 * Check if a raw transaction is an XRP transaction
 */
export function isXrpTransaction(tx: RawTransaction): tx is RawXrpTransaction {
  return tx._chain === 'xrp';
}

/**
 * Check if a raw transaction is a Substrate transaction
 */
export function isSubstrateTransaction(tx: RawTransaction): tx is RawSubstrateTransaction {
  return tx._chain === 'substrate';
}

// ============ Transaction Result Type Guards ============

/**
 * Check if a raw transaction result is an EVM transaction result
 */
export function isEvmTransactionResult(result: RawTransactionResult): result is RawEvmTransactionResult {
  return result._chain === 'evm';
}

/**
 * Check if a raw transaction result is a Solana transaction result
 */
export function isSolanaTransactionResult(result: RawTransactionResult): result is RawSolanaTransactionResult {
  return result._chain === 'svm';
}

/**
 * Check if a raw transaction result is a UTXO transaction result
 */
export function isUtxoTransactionResult(result: RawTransactionResult): result is RawUtxoTransactionResult {
  return result._chain === 'utxo';
}

/**
 * Check if a raw transaction result is a Tron transaction result
 */
export function isTronTransactionResult(result: RawTransactionResult): result is RawTronTransactionResult {
  return result._chain === 'tvm';
}

/**
 * Check if a raw transaction result is an XRP transaction result
 */
export function isXrpTransactionResult(result: RawTransactionResult): result is RawXrpTransactionResult {
  return result._chain === 'xrp';
}

/**
 * Check if a raw transaction result is a Substrate transaction result
 */
export function isSubstrateTransactionResult(result: RawTransactionResult): result is RawSubstrateTransactionResult {
  return result._chain === 'substrate';
}
