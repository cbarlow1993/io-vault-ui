import { InternalServerError, NotFoundError } from '@iofinnet/errors-sdk';
import {
  DurableNonce,
  type Chain,
  type SolanaChain,
  type SolanaTransactionBuilder,
  type SolanaWallet,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { logger } from '@/utils/powertools.js';
import { tryCatch } from '@/utils/try-catch.js';
import { buildTransactionErrorToHttpError } from '../error-utils.js';
import type { BuildTransactionResult, KnownError } from '../types.js';

/**
 * Error messages for durable nonce operations
 */
export const ERROR_INVALID_NONCE_ACCOUNT = 'invalid nonce account address';
export const ERROR_NONCE_ACCOUNT_NOT_FOUND = 'nonce account not found';
export const ERROR_FAILED_FETCH_NONCE_INFO = 'failed to fetch nonce account info';
export const ERROR_RPC_CLIENT_UNAVAILABLE = 'solana rpc client is not available';
export const ERROR_FAILED_BUILD_NONCE_TRANSACTION = 'failed to build nonce account transaction';
export const ERROR_INSUFFICIENT_SOL_BALANCE = 'insufficient balance';

/**
 * Known durable nonce errors mapped to HTTP error responses
 */
const knownErrors = new Map<string, KnownError>([
  [
    ERROR_INVALID_NONCE_ACCOUNT,
    {
      status: 400,
      message: 'Invalid nonce account address provided',
      path: ['nonceAccount'],
    },
  ],
  [
    ERROR_NONCE_ACCOUNT_NOT_FOUND,
    {
      status: 400,
      message: 'Nonce account not found',
      path: ['nonceAccount'],
    },
  ],
  [
    ERROR_FAILED_FETCH_NONCE_INFO,
    {
      status: 500,
      message: 'Failed to fetch nonce account information',
    },
  ],
  [
    ERROR_RPC_CLIENT_UNAVAILABLE,
    {
      status: 500,
      message: 'Solana RPC client is not available',
    },
  ],
  [
    ERROR_FAILED_BUILD_NONCE_TRANSACTION,
    {
      status: 500,
      message: 'Failed to build nonce account transaction',
    },
  ],
  [
    ERROR_INSUFFICIENT_SOL_BALANCE,
    {
      status: 400,
      message: 'Insufficient SOL balance for the transaction',
      path: ['amount'],
    },
  ],
]);

/**
 * Parameters for durable nonce operations
 */
export interface DurableNonceParams {
  wallet: SolanaWallet;
  chain: Chain;
}

/**
 * Result from getting durable nonce account info
 */
export interface DurableNonceAccountResult {
  nonceAccount: string;
  nonce?: string;
  authority?: string;
}

/**
 * Builds a transaction to create a durable nonce account
 */
export async function buildDurableNonceTransaction(
  params: DurableNonceParams
): Promise<BuildTransactionResult> {
  const { wallet, chain } = params;

  const { data: result, error: txError } = await tryCatch(
    (chain.TransactionBuilder as SolanaTransactionBuilder).buildCreateNonceAccountTransaction({
      from: wallet,
    })
  );

  if (txError) {
    logger.error('Error building durable nonce transaction', { error: txError });
    const errorMessage = (txError?.message || '').toLowerCase();
    buildTransactionErrorToHttpError(errorMessage, knownErrors);
  }

  if (!result?.transaction) {
    logger.error('Failed to build durable nonce transaction: no transaction returned');
    throw new InternalServerError('Failed to build transaction');
  }

  const { data: marshalledHex, error: marshalError } = await tryCatch(
    Promise.resolve(result.transaction.marshalHex())
  );

  if (marshalError) {
    logger.error('Error marshalling durable nonce transaction', { error: marshalError });
    throw new InternalServerError('Error marshalling transaction');
  }

  const { data: details, error: detailsError } = await tryCatch(result.transaction.toEIP712Details());

  if (detailsError) {
    logger.error('Error getting transaction details', { error: detailsError });
    throw new InternalServerError('Error getting transaction details');
  }

  return { marshalledHex: marshalledHex!, details: details! };
}

/**
 * Gets the durable nonce account info for a wallet
 */
export async function getDurableNonceAccount(
  params: DurableNonceParams
): Promise<DurableNonceAccountResult> {
  const { wallet, chain } = params;

  const { data: nonceAccount, error: nonceAccountError } = await tryCatch(
    (chain.TransactionBuilder as SolanaTransactionBuilder).getDurableNonceAddress({
      from: wallet,
    })
  );

  if (nonceAccountError) {
    logger.error('Error getting durable nonce address', { error: nonceAccountError });
    const errorMessage = (nonceAccountError?.message || '').toLowerCase();
    buildTransactionErrorToHttpError(errorMessage, knownErrors);
  }

  if (!nonceAccount) {
    throw new NotFoundError('Durable nonce account address not found');
  }

  const { data: isInitialized, error: initError } = await tryCatch(
    DurableNonce.isNonceAccountInitialized(nonceAccount, chain as SolanaChain)
  );

  if (initError) {
    logger.error('Error checking nonce account initialization', { error: initError });
    const errorMessage = (initError?.message || '').toLowerCase();
    buildTransactionErrorToHttpError(errorMessage, knownErrors);
  }

  if (!isInitialized) {
    throw new NotFoundError('Durable nonce account address not found');
  }

  const { data: accountInfo, error: accountInfoError } = await tryCatch(
    DurableNonce.fetchNonceAccountInfo(nonceAccount, chain as SolanaChain)
  );

  if (accountInfoError) {
    logger.error('Error fetching nonce account info', { error: accountInfoError });
    const errorMessage = (accountInfoError?.message || '').toLowerCase();
    buildTransactionErrorToHttpError(errorMessage, knownErrors);
  }

  return {
    nonceAccount,
    nonce: accountInfo?.nonce,
    authority: accountInfo?.authority,
  };
}
