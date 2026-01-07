import { InternalServerError } from '@iofinnet/errors-sdk';
import type {
  Chain,
  SolanaTransaction,
  SolanaTransactionBuilder,
  SolanaWallet,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { logger } from '@/utils/powertools.js';
import { tryCatch } from '@/utils/try-catch.js';
import { buildTransactionErrorToHttpError } from '../error-utils.js';
import type { BuildTransactionResult, KnownError } from '../types.js';

/**
 * Error messages for SVM transactions
 */
export const ERROR_INVALID_SENDER = 'invalid sender address';
export const ERROR_INVALID_SOLANA_ADDRESS = 'invalid solana address';
export const ERROR_INVALID_AMOUNT = 'invalid or missing `amount` (must be a number)';
export const ERROR_NEGATIVE_AMOUNT = 'invalid amount: must be greater than zero';
export const ERROR_EXCEEDS_SOL_DECIMALS = 'max decimal precision for sol is';
export const ERROR_EXCEEDS_TOKEN_DECIMALS = 'max decimal precision for token is';
export const ERROR_INSUFFICIENT_SOL_BALANCE = 'insufficient balance:';
export const ERROR_INSUFFICIENT_TOKEN_BALANCE = 'insufficient token balance:';
export const ERROR_TOKEN_ACCOUNT_NOT_FOUND = 'token account not found for mint';
export const ERROR_MINT_ACCOUNT_NOT_FOUND = 'mint account not found for address:';
export const ERROR_UNSUPPORTED_TOKEN_PROGRAM = 'unsupported token program id';
export const ERROR_DECIMALS_MISMATCH = 'provided decimals do not match on-chain metadata';
export const ERROR_UNSUPPORTED_MINT_PROGRAM = 'unsupported mint program owner';
export const ERROR_RPC_CLIENT_UNAVAILABLE = 'solana rpc client is not available';
export const ERROR_INVALID_ACCOUNTS_STRUCTURE = 'invalid accounts structure in instruction';
export const ERROR_INVALID_DATA_STRUCTURE = 'invalid data structure in instruction';
export const ERROR_FAILED_BUILD_TRANSACTION_MESSAGE = 'failed to build solana transaction message';
export const ERROR_FAILED_UNMARSHAL_SOLANA = 'unable to decode solana transaction';
export const ERROR_FAILED_BUILD_SPL_TRANSACTION = 'failed to build spl token transaction:';
export const ERROR_INVALID_NONCE_ACCOUNT = 'invalid nonce account address:';
export const ERROR_NONCE_ACCOUNT_NOT_FOUND = 'nonce account not found:';
export const ERROR_FAILED_FETCH_NONCE_INFO = 'failed to fetch nonce account info:';
export const ERROR_NONCE_AUTHORITY_MISMATCH = 'nonce authority mismatch. expected:';

/**
 * Known SVM transaction errors mapped to HTTP error responses
 */
const knownErrors = new Map<string, KnownError>([
  [
    ERROR_INVALID_SENDER,
    {
      status: 400,
      message: 'The sender address provided is not valid',
      path: ['from'],
    },
  ],
  [
    ERROR_INVALID_SOLANA_ADDRESS,
    {
      status: 400,
      message: 'The Solana address provided is not valid',
      path: ['to'],
    },
  ],
  [
    ERROR_INVALID_AMOUNT,
    {
      status: 400,
      message: 'Invalid or missing amount (must be a number)',
      path: ['amount'],
    },
  ],
  [
    ERROR_NEGATIVE_AMOUNT,
    {
      status: 400,
      message: 'Amount must be greater than zero',
      path: ['amount'],
    },
  ],
  [
    ERROR_EXCEEDS_SOL_DECIMALS,
    {
      status: 400,
      message: 'Amount exceeds maximum decimal precision for SOL',
      path: ['amount'],
    },
  ],
  [
    ERROR_EXCEEDS_TOKEN_DECIMALS,
    {
      status: 400,
      message: 'Amount exceeds maximum decimal precision for token',
      path: ['amount'],
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
  [
    ERROR_INSUFFICIENT_TOKEN_BALANCE,
    {
      status: 400,
      message: 'Insufficient token balance for the transaction',
      path: ['amount'],
    },
  ],
  [
    ERROR_TOKEN_ACCOUNT_NOT_FOUND,
    {
      status: 400,
      message: 'Token account not found for the specified mint',
      path: ['tokenAddress'],
    },
  ],
  [
    ERROR_MINT_ACCOUNT_NOT_FOUND,
    {
      status: 400,
      message: 'Mint account not found for the specified address',
      path: ['tokenAddress'],
    },
  ],
  [
    ERROR_UNSUPPORTED_TOKEN_PROGRAM,
    {
      status: 400,
      message: 'Unsupported token program ID',
      path: ['tokenAddress'],
    },
  ],
  [
    ERROR_DECIMALS_MISMATCH,
    {
      status: 400,
      message: 'Provided decimals do not match on-chain metadata',
      path: ['decimals'],
    },
  ],
  [
    ERROR_UNSUPPORTED_MINT_PROGRAM,
    {
      status: 400,
      message: 'Unsupported mint program owner. Expected SPL token program',
      path: ['tokenAddress'],
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
    ERROR_INVALID_ACCOUNTS_STRUCTURE,
    {
      status: 500,
      message: 'Invalid accounts structure in instruction',
    },
  ],
  [
    ERROR_INVALID_DATA_STRUCTURE,
    {
      status: 500,
      message: 'Invalid data structure in instruction',
    },
  ],
  [
    ERROR_FAILED_BUILD_TRANSACTION_MESSAGE,
    {
      status: 500,
      message: 'Failed to build Solana transaction message',
    },
  ],
  [
    ERROR_FAILED_UNMARSHAL_SOLANA,
    {
      status: 500,
      message: 'Unable to decode Solana transaction',
    },
  ],
  [
    ERROR_FAILED_BUILD_SPL_TRANSACTION,
    {
      status: 500,
      message: 'Failed to build SPL token transaction',
    },
  ],
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
    ERROR_NONCE_AUTHORITY_MISMATCH,
    {
      status: 400,
      message: 'Nonce authority mismatch with expected authority',
      path: ['nonceAccount'],
    },
  ],
]);

/**
 * Parameters for building SVM native transactions
 */
export interface SvmNativeParams {
  wallet: SolanaWallet;
  chain: Chain;
  amount: string;
  to: string;
  nonceAccount?: string;
}

/**
 * Parameters for building SVM token transactions
 */
export interface SvmTokenParams extends SvmNativeParams {
  tokenAddress: string;
  decimals?: number;
}

/**
 * Marshals transaction and extracts details
 */
async function marshalTransaction(tx: SolanaTransaction): Promise<BuildTransactionResult> {
  const { data: marshalledHex, error: marshalError } = await tryCatch(
    Promise.resolve(tx.marshalHex())
  );

  if (marshalError) {
    logger.error('Error marshalling SVM transaction', { error: marshalError });
    throw new InternalServerError('Error marshalling transaction');
  }

  const { data: details, error: detailsError } = await tryCatch(tx.toEIP712Details());

  if (detailsError) {
    logger.error('Error getting transaction details', { error: detailsError });
    throw new InternalServerError('Error getting transaction details');
  }

  return { marshalledHex: marshalledHex!, details: details! };
}

/**
 * Builds an unsigned SVM native (SOL) transaction
 */
export async function buildSvmNativeTransaction(params: SvmNativeParams): Promise<BuildTransactionResult> {
  const { wallet, chain, amount, to, nonceAccount } = params;

  const { data: tx, error: txError } = await tryCatch(
    (chain.TransactionBuilder as SolanaTransactionBuilder).buildNativeTransaction({
      amount,
      from: wallet,
      to,
      nonceAccount,
    })
  );

  if (txError) {
    logger.error('Error building SVM native transaction', { error: txError });
    const errorMessage = (txError?.message || '').toLowerCase();
    buildTransactionErrorToHttpError(errorMessage, knownErrors);
  }

  if (!tx) {
    logger.error('Failed to build SVM native transaction: no transaction returned');
    throw new InternalServerError('Failed to build transaction');
  }

  return marshalTransaction(tx);
}

/**
 * Builds an unsigned SVM token (SPL) transaction
 */
export async function buildSvmTokenTransaction(params: SvmTokenParams): Promise<BuildTransactionResult> {
  const { wallet, chain, amount, to, tokenAddress, decimals, nonceAccount } = params;

  const { data: tx, error: txError } = await tryCatch(
    (chain.TransactionBuilder as SolanaTransactionBuilder).buildTokenTransaction({
      amount,
      from: wallet,
      to,
      tokenAddress,
      decimals,
      nonceAccount,
    })
  );

  if (txError) {
    logger.error('Error building SVM token transaction', { error: txError });
    const errorMessage = (txError?.message || '').toLowerCase();
    buildTransactionErrorToHttpError(errorMessage, knownErrors);
  }

  if (!tx) {
    logger.error('Failed to build SVM token transaction: no transaction returned');
    throw new InternalServerError('Failed to build transaction');
  }

  return marshalTransaction(tx);
}
