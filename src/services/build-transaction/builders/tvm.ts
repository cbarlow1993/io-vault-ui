import { InternalServerError } from '@iofinnet/errors-sdk';
import type {
  Chain,
  TronTransaction,
  TronTransactionBuilder,
  TronWallet,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { logger } from '@/utils/powertools.js';
import { tryCatch } from '@/utils/try-catch.js';
import { buildTransactionErrorToHttpError } from '../error-utils.js';
import type { BuildTransactionResult, KnownError } from '../types.js';

/**
 * Error messages for TVM (Tron) transactions
 */
// Transaction signing errors
export const ERROR_TRANSACTION_NOT_SIGNED = 'transaction not signed';
export const ERROR_INVALID_SIGNATURE_FORMAT = 'invalid signature format';
export const ERROR_INVALID_SIGNATURE_LENGTH =
  'invalid signature length for tron. expected 130 hex chars (65 bytes), got';

// Transaction building errors
export const ERROR_FAILED_BUILD_TRANSACTION = 'failed to build transaction:';

// Address validation errors
export const ERROR_MISSING_FROM_ADDRESS = 'invalid transaction parameters: `from` address is required';
export const ERROR_INVALID_FROM_ADDRESS =
  'invalid transaction parameters: `from` address is not a valid tron address';
export const ERROR_INVALID_TO_ADDRESS =
  'invalid transaction parameters: `to` address is not a valid tron address';
export const ERROR_EMPTY_TO_ADDRESS =
  "invalid transaction parameters: 'to' address cannot be an empty string";
export const ERROR_MISSING_CONTRACT_DATA =
  "invalid transaction parameters: data is required for contract deployment (when 'to' is undefined)";

// Amount validation errors
export const ERROR_MISSING_AMOUNT = 'invalid transaction parameters: amount is required';
export const ERROR_INVALID_AMOUNT_FORMAT = 'invalid or missing `amount` (must be a number)';
export const ERROR_NEGATIVE_AMOUNT = 'invalid amount: must be greater than or equal to zero';
export const ERROR_ZERO_AMOUNT = 'invalid amount: must be greater than zero for trx transfer';
export const ERROR_INSUFFICIENT_BALANCE = 'insufficient trx balance:';
export const ERROR_INSUFFICIENT_ENERGY = 'failed to build transaction: insufficient energy:';

// Balance validation errors
export const ERROR_FAILED_BALANCE_CHECK = 'failed to check balance for transaction validation';

// Transaction unmarshaling errors
export const ERROR_FAILED_UNMARSHAL_HEX = 'failed to unmarshal transaction from hex:';

// Utility errors
export const ERROR_INVALID_TRON_ADDRESS = 'invalid tron address:';
export const ERROR_INVALID_HEX_VALUE = 'the passed value is not convertible to a hex string';

// Contract and transaction processing errors
export const ERROR_NO_CONTRACT_FOUND = 'no contract found in transaction';
export const ERROR_NO_CONTRACTS_FOUND = 'no contracts found in transaction';
export const ERROR_FAILED_GET_RAW_DATA = 'failed to get raw transaction data';
export const ERROR_FAILED_ESTIMATE_FEE = 'failed to estimate fee:';
export const ERROR_TRANSACTION_NOT_FOUND = 'transaction not found';
export const ERROR_TRANSACTION_NOT_SERIALIZED = 'transaction is not serialized';
export const ERROR_BROADCAST_FAILED = 'broadcast failed';
export const ERROR_FAILED_BROADCAST = 'failed to broadcast transaction:';
export const ERROR_EXPLORER_URL_NOT_FOUND = 'explorer url not found for network';
export const ERROR_FAILED_HTTP_REQUEST = 'failed to fetch post';

/**
 * Known TVM transaction errors mapped to HTTP error responses
 */
const knownErrors = new Map<string, KnownError>([
  // Transaction signing errors
  [
    ERROR_TRANSACTION_NOT_SIGNED,
    {
      status: 400,
      message: 'The transaction has not been signed yet',
    },
  ],
  [
    ERROR_INVALID_SIGNATURE_FORMAT,
    {
      status: 400,
      message: 'The signature format is invalid',
      path: ['signature'],
    },
  ],
  [
    ERROR_INVALID_SIGNATURE_LENGTH,
    {
      status: 400,
      message: 'The signature length is invalid for TRON transactions',
      path: ['signature'],
    },
  ],

  // Balance and energy validation errors (MUST come before generic transaction building errors)
  [
    ERROR_INSUFFICIENT_BALANCE,
    {
      status: 400,
      message: 'The sender does not have enough TRX to complete the transaction',
      path: ['from'],
    },
  ],
  [
    ERROR_INSUFFICIENT_ENERGY,
    {
      status: 400,
      message: 'The sender does not have enough energy to complete the transaction',
      path: ['from'],
    },
  ],
  [
    ERROR_FAILED_BALANCE_CHECK,
    {
      status: 400,
      message: 'Failed to check account balance for transaction validation',
      path: ['from'],
    },
  ],

  // Transaction building errors (generic - MUST come after more specific errors)
  [
    ERROR_FAILED_BUILD_TRANSACTION,
    {
      status: 500,
      message: 'Failed to build the transaction',
    },
  ],

  // Address validation errors
  [
    ERROR_MISSING_FROM_ADDRESS,
    {
      status: 400,
      message: 'The sender address is required',
      path: ['from'],
    },
  ],
  [
    ERROR_INVALID_FROM_ADDRESS,
    {
      status: 400,
      message: 'The sender address is not a valid TRON address',
      path: ['from'],
    },
  ],
  [
    ERROR_INVALID_TO_ADDRESS,
    {
      status: 400,
      message: 'The recipient address is not a valid TRON address',
      path: ['to'],
    },
  ],
  [
    ERROR_EMPTY_TO_ADDRESS,
    {
      status: 400,
      message: 'The recipient address cannot be an empty string',
      path: ['to'],
    },
  ],
  [
    ERROR_MISSING_CONTRACT_DATA,
    {
      status: 400,
      message: 'Contract data is required when deploying a contract (when recipient is undefined)',
      path: ['data'],
    },
  ],

  // Amount validation errors
  [
    ERROR_MISSING_AMOUNT,
    {
      status: 400,
      message: 'The transaction amount is required',
      path: ['amount'],
    },
  ],
  [
    ERROR_INVALID_AMOUNT_FORMAT,
    {
      status: 400,
      message: 'The amount must be a valid number',
      path: ['amount'],
    },
  ],
  [
    ERROR_NEGATIVE_AMOUNT,
    {
      status: 400,
      message: 'The amount must be greater than or equal to zero',
      path: ['amount'],
    },
  ],
  [
    ERROR_ZERO_AMOUNT,
    {
      status: 400,
      message: 'The amount must be greater than zero for TRX transfers',
      path: ['amount'],
    },
  ],

  // Transaction unmarshaling errors
  [
    ERROR_FAILED_UNMARSHAL_HEX,
    {
      status: 500,
      message: 'Failed to parse the hex-encoded transaction data',
    },
  ],

  // Utility errors
  [
    ERROR_INVALID_TRON_ADDRESS,
    {
      status: 400,
      message: 'The provided address is not a valid TRON address',
    },
  ],
  [
    ERROR_INVALID_HEX_VALUE,
    {
      status: 400,
      message: 'The provided value cannot be converted to a hex string',
    },
  ],

  // Contract and transaction processing errors
  [
    ERROR_NO_CONTRACT_FOUND,
    {
      status: 500,
      message: 'No contract found in the transaction',
    },
  ],
  [
    ERROR_NO_CONTRACTS_FOUND,
    {
      status: 500,
      message: 'No contracts found in the transaction',
    },
  ],
  [
    ERROR_FAILED_GET_RAW_DATA,
    {
      status: 500,
      message: 'Failed to get raw transaction data',
    },
  ],
  [
    ERROR_FAILED_ESTIMATE_FEE,
    {
      status: 500,
      message: 'Failed to estimate transaction fee',
    },
  ],
  [
    ERROR_TRANSACTION_NOT_FOUND,
    {
      status: 500,
      message: 'Transaction not found',
    },
  ],
  [
    ERROR_TRANSACTION_NOT_SERIALIZED,
    {
      status: 500,
      message: 'Transaction is not serialized',
    },
  ],
  [
    ERROR_BROADCAST_FAILED,
    {
      status: 500,
      message: 'Transaction broadcast failed',
    },
  ],
  [
    ERROR_FAILED_BROADCAST,
    {
      status: 500,
      message: 'Failed to broadcast the transaction',
    },
  ],
  [
    ERROR_EXPLORER_URL_NOT_FOUND,
    {
      status: 500,
      message: 'Explorer URL not found for the network',
    },
  ],
  [
    ERROR_FAILED_HTTP_REQUEST,
    {
      status: 500,
      message: 'Failed to fetch data from external service',
    },
  ],
]);

/**
 * Parameters for building TVM native transactions
 */
export interface TvmNativeParams {
  wallet: TronWallet;
  chain: Chain;
  amount: string;
  to: string;
}

/**
 * Parameters for building TVM token transactions
 */
export interface TvmTokenParams extends TvmNativeParams {
  tokenAddress: string;
}

/**
 * Marshals transaction and extracts details
 */
async function marshalTransaction(tx: TronTransaction): Promise<BuildTransactionResult> {
  const { data: marshalledHex, error: marshalError } = await tryCatch(
    Promise.resolve(tx.marshalHex())
  );

  if (marshalError) {
    logger.error('Error marshalling TVM transaction', { error: marshalError });
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
 * Builds an unsigned TVM native (TRX) transaction
 */
export async function buildTvmNativeTransaction(
  params: TvmNativeParams
): Promise<BuildTransactionResult> {
  const { wallet, chain, amount, to } = params;

  const { data: tx, error: txError } = await tryCatch(
    (chain.TransactionBuilder as TronTransactionBuilder).buildNativeTransaction({
      amount,
      from: wallet,
      to,
    })
  );

  if (txError) {
    logger.error('Error building TVM native transaction', { error: txError });
    const errorMessage = (txError?.message || '').toLowerCase();
    buildTransactionErrorToHttpError(errorMessage, knownErrors);
  }

  if (!tx) {
    logger.error('Failed to build TVM native transaction: no transaction returned');
    throw new InternalServerError('Failed to build transaction');
  }

  return marshalTransaction(tx);
}

/**
 * Builds an unsigned TVM token (TRC20) transaction
 */
export async function buildTvmTokenTransaction(
  params: TvmTokenParams
): Promise<BuildTransactionResult> {
  const { wallet, chain, amount, to, tokenAddress } = params;

  const { data: tx, error: txError } = await tryCatch(
    (chain.TransactionBuilder as TronTransactionBuilder).buildTokenTransaction({
      amount,
      from: wallet,
      to,
      tokenAddress,
    })
  );

  if (txError) {
    logger.error('Error building TVM token transaction', { error: txError });
    const errorMessage = (txError?.message || '').toLowerCase();
    buildTransactionErrorToHttpError(errorMessage, knownErrors);
  }

  if (!tx) {
    logger.error('Failed to build TVM token transaction: no transaction returned');
    throw new InternalServerError('Failed to build transaction');
  }

  return marshalTransaction(tx);
}
