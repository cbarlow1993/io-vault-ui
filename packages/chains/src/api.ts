// packages/chains/src/api.ts

import type {
  ChainAlias,
  NativeBalance,
  TokenBalance,
  DecodeFormat,
  FeeEstimate,
  Ecosystem,
  EvmChainAlias,
} from './core/types.js';
import type {
  IChainProvider,
  NativeTransferParams,
  TokenTransferParams,
  ContractReadParams,
  ContractReadResult,
  ContractCallParams,
  ContractDeployParams,
  DeployedContract,
  UnsignedTransaction,
  NormalisedTransaction,
  RawTransaction,
  RawEvmTransaction,
  RawSolanaTransaction,
  RawUtxoTransaction,
  RawTronTransaction,
  RawXrpTransaction,
} from './core/interfaces.js';
import { providerCache } from './core/provider-cache.js';
import { isValidChainAlias, getEcosystem } from './core/registry.js';
import { ChainError, UnsupportedChainError } from './core/errors.js';

// EVM imports
import { EvmChainProvider } from './evm/provider.js';
import { UnsignedEvmTransaction } from './evm/transaction-builder.js';
import { getEvmChainConfig } from './evm/config.js';

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
 * Get or create a chain provider for the specified chain
 * Providers are cached for efficiency
 */
export function getChainProvider(chainAlias: ChainAlias, rpcUrl?: string): IChainProvider {
  if (!isValidChainAlias(chainAlias)) {
    throw new UnsupportedChainError(chainAlias);
  }

  const ecosystem = getEcosystem(chainAlias);
  const effectiveRpcUrl = rpcUrl ?? globalConfig.rpcOverrides?.[chainAlias];

  // Check cache first
  if (effectiveRpcUrl) {
    const cached = providerCache.get(chainAlias, effectiveRpcUrl);
    if (cached) {
      return cached;
    }
  }

  // Create provider based on ecosystem
  const provider = createProviderForEcosystem(ecosystem, chainAlias, effectiveRpcUrl);

  // Cache the provider
  if (effectiveRpcUrl) {
    providerCache.set(chainAlias, effectiveRpcUrl, provider);
  } else {
    providerCache.set(chainAlias, provider.config.rpcUrl, provider);
  }

  return provider;
}

function createProviderForEcosystem(
  ecosystem: Ecosystem,
  chainAlias: ChainAlias,
  rpcUrl?: string
): IChainProvider {
  switch (ecosystem) {
    case 'evm': {
      return new EvmChainProvider(chainAlias as EvmChainAlias, rpcUrl);
    }
    case 'svm':
    case 'utxo':
    case 'tvm':
    case 'xrp':
    case 'substrate':
      throw new ChainError(`Ecosystem ${ecosystem} is not yet implemented`, chainAlias);
    default:
      throw new ChainError(`Unknown ecosystem: ${ecosystem}`, chainAlias);
  }
}

// ============ Balance Convenience Functions ============

/**
 * Get the native balance for an address
 */
export async function getNativeBalance(
  chainAlias: ChainAlias,
  address: string,
  rpcUrl?: string
): Promise<NativeBalance> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.getNativeBalance(address);
}

/**
 * Get the token balance for an address
 */
export async function getTokenBalance(
  chainAlias: ChainAlias,
  address: string,
  contractAddress: string,
  rpcUrl?: string
): Promise<TokenBalance> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.getTokenBalance(address, contractAddress);
}

// ============ Transaction Building Convenience Functions ============

/**
 * Build a native token transfer transaction
 */
export async function buildNativeTransfer(
  chainAlias: ChainAlias,
  params: NativeTransferParams,
  rpcUrl?: string
): Promise<UnsignedTransaction> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.buildNativeTransfer(params);
}

/**
 * Build a token transfer transaction
 */
export async function buildTokenTransfer(
  chainAlias: ChainAlias,
  params: TokenTransferParams,
  rpcUrl?: string
): Promise<UnsignedTransaction> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.buildTokenTransfer(params);
}

// ============ Transaction Decoding ============

/**
 * Decode a serialized transaction to raw or normalised format
 */
export function decodeTransaction<F extends DecodeFormat>(
  chainAlias: ChainAlias,
  serialized: string,
  format: F,
  rpcUrl?: string
): F extends 'raw' ? RawTransaction : NormalisedTransaction {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.decode(serialized, format);
}

/**
 * Parse a serialized transaction back into an UnsignedTransaction object
 * This allows rebuilding, signing, and other operations
 */
export function parseTransaction(
  chainAlias: ChainAlias,
  serialized: string,
  rpcUrl?: string
): UnsignedTransaction {
  if (!isValidChainAlias(chainAlias)) {
    throw new UnsupportedChainError(chainAlias);
  }

  const ecosystem = getEcosystem(chainAlias);

  switch (ecosystem) {
    case 'evm': {
      const txData = JSON.parse(serialized);
      const config = getEvmChainConfig(chainAlias as EvmChainAlias, rpcUrl);
      return new UnsignedEvmTransaction(config, txData);
    }
    case 'svm':
    case 'utxo':
    case 'tvm':
    case 'xrp':
    case 'substrate':
      throw new ChainError(`Ecosystem ${ecosystem} is not yet implemented`, chainAlias);
    default:
      throw new ChainError(`Unknown ecosystem: ${ecosystem}`, chainAlias);
  }
}

// ============ Fee Estimation ============

/**
 * Estimate transaction fees for a chain
 */
export async function estimateFee(
  chainAlias: ChainAlias,
  rpcUrl?: string
): Promise<FeeEstimate> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.estimateFee();
}

/**
 * Estimate gas for a contract call
 */
export async function estimateGas(
  chainAlias: ChainAlias,
  params: ContractCallParams,
  rpcUrl?: string
): Promise<string> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.estimateGas(params);
}

// ============ Account Info ============

/**
 * Get the transaction count (nonce) for an address
 */
export async function getTransactionCount(
  chainAlias: ChainAlias,
  address: string,
  rpcUrl?: string
): Promise<number> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  // The provider may have a getTransactionCount method
  if ('getTransactionCount' in provider && typeof provider.getTransactionCount === 'function') {
    return (provider as any).getTransactionCount(address);
  }
  throw new ChainError('getTransactionCount not supported for this chain', chainAlias);
}

// ============ Contract Operations ============

/**
 * Read data from a contract (view/pure functions)
 */
export async function contractRead(
  chainAlias: ChainAlias,
  params: ContractReadParams,
  rpcUrl?: string
): Promise<ContractReadResult> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.contractRead(params);
}

/**
 * Build a contract call transaction
 */
export async function contractCall(
  chainAlias: ChainAlias,
  params: ContractCallParams,
  rpcUrl?: string
): Promise<UnsignedTransaction> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.contractCall(params);
}

/**
 * Build a contract deployment transaction
 */
export async function contractDeploy(
  chainAlias: ChainAlias,
  params: ContractDeployParams,
  rpcUrl?: string
): Promise<DeployedContract> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.contractDeploy(params);
}

// ============ Type Guards ============

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
