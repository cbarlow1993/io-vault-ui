import type { Chain, ChainAlias, EcoSystem, IWalletLike } from '@iofinnet/io-core-dapp-utils-chains-sdk';

/**
 * Result from building a transaction
 */
export interface BuildTransactionResult {
  marshalledHex: string;
  details: Array<{ name: string; type: string; value: string }>;
}

/**
 * Result from WalletFactory
 */
export interface WalletFactoryResult<T extends IWalletLike = IWalletLike> {
  wallet: T;
  chain: Chain;
}

/**
 * Common parameters for all transaction builders
 */
export interface BaseTransactionParams {
  amount: string;
  to: string;
  derivationPath?: string;
}

/**
 * Parameters passed to native transaction builders (after wallet resolution)
 */
export interface NativeBuildParams<T extends IWalletLike = IWalletLike> extends BaseTransactionParams {
  wallet: T;
  chain: Chain;
}

/**
 * Parameters passed to token transaction builders (after wallet resolution)
 */
export interface TokenBuildParams<T extends IWalletLike = IWalletLike> extends NativeBuildParams<T> {
  tokenAddress: string;
}

/**
 * Known error structure for error mapping
 */
export interface KnownError {
  status: number;
  message: string;
  path?: string[];
}

/**
 * Builder key format
 */
export type BuilderKey = `${EcoSystem}:${ChainAlias}`;
