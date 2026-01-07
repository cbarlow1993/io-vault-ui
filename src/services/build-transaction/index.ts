import { UserInputError } from '@iofinnet/errors-sdk';
import {
  type ChainAlias,
  type EcoSystem,
  EvmChainAliases,
  SvmChainAliases,
  TronChainAliases,
  UtxoChainAliases,
  XrpChainAliases,
  SubstrateChainAliases,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { BuildTransactionResult, BuilderKey } from './types.js';
import type { WalletFactory } from './wallet-factory.js';
import {
  buildEvmNativeTransaction,
  buildEvmTokenTransaction,
  type EvmNativeParams,
  type EvmTokenParams,
} from './builders/evm.js';
import {
  buildSvmNativeTransaction,
  buildSvmTokenTransaction,
  type SvmNativeParams,
  type SvmTokenParams,
} from './builders/svm.js';
import { buildUtxoNativeTransaction, type UtxoNativeParams } from './builders/utxo.js';
import {
  buildTvmNativeTransaction,
  buildTvmTokenTransaction,
  type TvmNativeParams,
  type TvmTokenParams,
} from './builders/tvm.js';
import { buildXrpNativeTransaction, type XrpNativeParams } from './builders/xrp.js';
import { buildSubstrateNativeTransaction, type SubstrateNativeParams } from './builders/substrate.js';

// Re-export types and wallet factory
export * from './types.js';
export * from './wallet-factory.js';

/**
 * Type for native transaction builder functions
 */
type NativeBuilderFn = (params: any) => Promise<BuildTransactionResult>;

/**
 * Type for token transaction builder functions
 */
type TokenBuilderFn = (params: any) => Promise<BuildTransactionResult>;

/**
 * Registry mapping ecosystem:chain to native transaction builders
 */
const nativeBuilders: Partial<Record<BuilderKey, NativeBuilderFn>> = {
  // EVM chains
  ...Object.values(EvmChainAliases).reduce(
    (acc, alias) => {
      acc[`evm:${alias}` as BuilderKey] = buildEvmNativeTransaction;
      return acc;
    },
    {} as Record<BuilderKey, NativeBuilderFn>
  ),
  // SVM chains
  [`svm:${SvmChainAliases.SOLANA}` as BuilderKey]: buildSvmNativeTransaction,
  // UTXO chains
  [`utxo:${UtxoChainAliases.BITCOIN}` as BuilderKey]: buildUtxoNativeTransaction,
  [`utxo:${UtxoChainAliases.MNEE}` as BuilderKey]: buildUtxoNativeTransaction,
  // TVM chains
  [`tvm:${TronChainAliases.TRON}` as BuilderKey]: buildTvmNativeTransaction,
  // XRP chains
  [`xrp:${XrpChainAliases.XRP}` as BuilderKey]: buildXrpNativeTransaction,
  // Substrate chains
  [`substrate:${SubstrateChainAliases.BITTENSOR}` as BuilderKey]: buildSubstrateNativeTransaction,
};

/**
 * Registry mapping ecosystem:chain to token transaction builders
 * Note: UTXO, XRP, and Substrate do NOT support token transactions
 */
const tokenBuilders: Partial<Record<BuilderKey, TokenBuilderFn>> = {
  // EVM chains
  ...Object.values(EvmChainAliases).reduce(
    (acc, alias) => {
      acc[`evm:${alias}` as BuilderKey] = buildEvmTokenTransaction;
      return acc;
    },
    {} as Record<BuilderKey, TokenBuilderFn>
  ),
  // SVM chains
  [`svm:${SvmChainAliases.SOLANA}` as BuilderKey]: buildSvmTokenTransaction,
  // TVM chains
  [`tvm:${TronChainAliases.TRON}` as BuilderKey]: buildTvmTokenTransaction,
};

/**
 * Parameters for native transactions (before wallet resolution)
 */
export interface NativeTransactionParams {
  vaultId: string;
  amount: string;
  to: string;
  derivationPath?: string;
  // EVM-specific
  gasPrice?: string;
  gasLimit?: string;
  nonce?: number;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  type?: number;
  data?: string;
  // SVM-specific
  nonceAccount?: string;
  // UTXO-specific
  feeRate?: string;
  utxos?: Array<{ txid: string; vout: number; value: number }>;
  // XRP-specific
  memo?: string;
  tag?: string;
}

/**
 * Parameters for token transactions (before wallet resolution)
 */
export interface TokenTransactionParams extends NativeTransactionParams {
  tokenAddress: string;
  // SVM-specific
  decimals?: number;
}

/**
 * Routes native transaction to the appropriate builder based on ecosystem:chain
 */
export async function routeNativeTransaction(
  ecosystem: EcoSystem,
  chainAlias: ChainAlias,
  params: NativeTransactionParams,
  walletFactory: WalletFactory
): Promise<BuildTransactionResult> {
  const builderKey = `${ecosystem}:${chainAlias}` as BuilderKey;
  const builder = nativeBuilders[builderKey];

  if (!builder) {
    throw new UserInputError(`Unsupported ecosystem:chain combination: ${ecosystem}:${chainAlias}`);
  }

  const { wallet, chain } = await walletFactory.createWallet(
    params.vaultId,
    chainAlias,
    params.derivationPath
  );

  // Build params based on ecosystem
  const buildParams = buildNativeParams(ecosystem, wallet, chain, params);

  return builder(buildParams);
}

/**
 * Routes token transaction to the appropriate builder based on ecosystem:chain
 */
export async function routeTokenTransaction(
  ecosystem: EcoSystem,
  chainAlias: ChainAlias,
  params: TokenTransactionParams,
  walletFactory: WalletFactory
): Promise<BuildTransactionResult> {
  const builderKey = `${ecosystem}:${chainAlias}` as BuilderKey;
  const builder = tokenBuilders[builderKey];

  if (!builder) {
    // Check if this is a valid native chain that doesn't support tokens
    const nativeBuilder = nativeBuilders[builderKey];
    if (nativeBuilder) {
      throw new UserInputError(`Token transactions are not supported for ${ecosystem}:${chainAlias}`);
    }
    throw new UserInputError(`Unsupported ecosystem:chain combination: ${ecosystem}:${chainAlias}`);
  }

  const { wallet, chain } = await walletFactory.createWallet(
    params.vaultId,
    chainAlias,
    params.derivationPath
  );

  // Build params based on ecosystem
  const buildParams = buildTokenParams(ecosystem, wallet, chain, params);

  return builder(buildParams);
}

/**
 * Builds native transaction params based on ecosystem
 */
function buildNativeParams(
  ecosystem: EcoSystem,
  wallet: any,
  chain: any,
  params: NativeTransactionParams
): EvmNativeParams | SvmNativeParams | UtxoNativeParams | TvmNativeParams | XrpNativeParams | SubstrateNativeParams {
  const baseParams = {
    wallet,
    chain,
    amount: params.amount,
    to: params.to,
  };

  switch (ecosystem) {
    case 'evm':
      return {
        ...baseParams,
        gasPrice: params.gasPrice,
        gasLimit: params.gasLimit,
        nonce: params.nonce,
        maxFeePerGas: params.maxFeePerGas,
        maxPriorityFeePerGas: params.maxPriorityFeePerGas,
        type: params.type,
        data: params.data,
      } as EvmNativeParams;

    case 'svm':
      return {
        ...baseParams,
        nonceAccount: params.nonceAccount,
      } as SvmNativeParams;

    case 'utxo':
      return {
        ...baseParams,
        feeRate: params.feeRate,
        utxos: params.utxos,
      } as UtxoNativeParams;

    case 'tvm':
      return baseParams as TvmNativeParams;

    case 'xrp':
      return {
        ...baseParams,
        memo: params.memo,
        tag: params.tag,
      } as XrpNativeParams;

    case 'substrate':
      return baseParams as SubstrateNativeParams;

    default:
      return baseParams;
  }
}

/**
 * Builds token transaction params based on ecosystem
 */
function buildTokenParams(
  ecosystem: EcoSystem,
  wallet: any,
  chain: any,
  params: TokenTransactionParams
): EvmTokenParams | SvmTokenParams | TvmTokenParams {
  const baseParams = {
    wallet,
    chain,
    amount: params.amount,
    to: params.to,
    tokenAddress: params.tokenAddress,
  };

  switch (ecosystem) {
    case 'evm':
      return {
        ...baseParams,
        gasPrice: params.gasPrice,
        gasLimit: params.gasLimit,
        nonce: params.nonce,
        maxFeePerGas: params.maxFeePerGas,
        maxPriorityFeePerGas: params.maxPriorityFeePerGas,
        type: params.type,
        data: params.data,
      } as EvmTokenParams;

    case 'svm':
      return {
        ...baseParams,
        decimals: params.decimals,
        nonceAccount: params.nonceAccount,
      } as SvmTokenParams;

    case 'tvm':
      return baseParams as TvmTokenParams;

    default:
      return baseParams as any;
  }
}
