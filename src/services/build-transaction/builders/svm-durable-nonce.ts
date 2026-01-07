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
import type { BuildTransactionResult } from '../types.js';

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
    throw new InternalServerError(errorMessage);
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
    throw new InternalServerError(errorMessage);
  }

  if (!nonceAccount) {
    throw new NotFoundError('Durable nonce account address not found');
  }

  const isInitialized = await DurableNonce.isNonceAccountInitialized(
    nonceAccount,
    chain as SolanaChain
  );

  if (!isInitialized) {
    throw new NotFoundError('Durable nonce account address not found');
  }

  const { data: accountInfo, error: accountInfoError } = await tryCatch(
    DurableNonce.fetchNonceAccountInfo(nonceAccount, chain as SolanaChain)
  );

  if (accountInfoError) {
    logger.error('Error fetching nonce account info', { error: accountInfoError });
    throw new InternalServerError('Error fetching nonce account info');
  }

  return {
    nonceAccount,
    nonce: accountInfo?.nonce,
    authority: accountInfo?.authority,
  };
}
