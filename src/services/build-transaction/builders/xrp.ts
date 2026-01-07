import { InternalServerError } from '@iofinnet/errors-sdk';
import type {
  Chain,
  XrpWallet,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { logger } from '@/utils/powertools.js';
import { tryCatch } from '@/utils/try-catch.js';
import { buildTransactionErrorToHttpError } from '../error-utils.js';
import type { BuildTransactionResult, KnownError } from '../types.js';

/**
 * Error messages for XRP transactions
 */
export const ERROR_INVALID_SENDER = 'invalid sender address';
export const ERROR_INVALID_RECIPIENT = 'invalid xrp address';
export const ERROR_SELF_SEND = 'cannot send xrp to your own address';
export const ERROR_INVALID_DECIMALS = 'max decimal precision for xrp';
export const ERROR_INSUFFICIENT_BALANCE = 'insufficient balance';
export const ERROR_REQUIRED_DEST_TAG = 'destination tag is required for this recipient';
export const ERROR_INVALID_PUBKEY = 'invalid eddsa curve public key length';
export const ERROR_FAILED_AUTOFILL = 'failed to autofill transaction';
export const ERROR_FAILED_BUILD = 'failed to build transaction';
export const ERROR_FAILED_DECODE = 'unable to decode ripple transaction';
export const ERROR_FAILED_BROADCAST = 'failed to send transaction';
export const ERROR_NO_SERVER_RESPONSE = 'transaction submission failed: no response from server';
export const ERROR_TX_FAILED = 'transaction failed';

/**
 * Known XRP transaction errors mapped to HTTP error responses
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
    ERROR_INVALID_RECIPIENT,
    {
      status: 400,
      message: 'The recipient address provided is not valid',
      path: ['to'],
    },
  ],
  [
    ERROR_SELF_SEND,
    {
      status: 400,
      message: 'Cannot send XRP to your own address',
      path: ['to'],
    },
  ],
  [
    ERROR_INVALID_DECIMALS,
    {
      status: 400,
      message: 'XRP transactions support a maximum of 6 decimal places',
      path: ['amount'],
    },
  ],
  [
    ERROR_INSUFFICIENT_BALANCE,
    {
      status: 400,
      message:
        'Insufficient balance. The transaction would drop your account below the required 1 XRP reserve',
      path: ['from'],
    },
  ],
  [
    ERROR_REQUIRED_DEST_TAG,
    {
      status: 400,
      message: 'A destination tag is required for this recipient address',
      path: ['to'],
    },
  ],
  [
    ERROR_INVALID_PUBKEY,
    {
      status: 400,
      message: 'The provided public key is invalid',
      path: ['to'],
    },
  ],
  [
    ERROR_FAILED_AUTOFILL,
    {
      status: 500,
      message: 'Failed to automatically fill transaction details',
    },
  ],
  [
    ERROR_FAILED_BUILD,
    {
      status: 500,
      message: 'Failed to build the transaction',
    },
  ],
  [
    ERROR_FAILED_DECODE,
    {
      status: 500,
      message: 'Failed to decode the transaction data',
    },
  ],
  [
    ERROR_FAILED_BROADCAST,
    {
      status: 500,
      message: 'Failed to broadcast the transaction to the network',
    },
  ],
  [
    ERROR_NO_SERVER_RESPONSE,
    {
      status: 500,
      message: 'No response received from the XRP network',
    },
  ],
  [
    ERROR_TX_FAILED,
    {
      status: 500,
      message: 'The transaction was rejected by the XRP network',
    },
  ],
]);

/**
 * Parameters for building XRP native transactions
 */
export interface XrpNativeParams {
  wallet: XrpWallet;
  chain: Chain;
  amount: string;
  to: string;
  memo?: string;
  tag?: string;
}

/**
 * Transaction interface with marshal methods
 */
interface MarshalableTransaction {
  marshalHex(): string;
  toEIP712Details(): Promise<Array<{ name: string; type: string; value: string }>>;
}

/**
 * Marshals transaction and extracts details
 */
async function marshalTransaction(tx: MarshalableTransaction): Promise<BuildTransactionResult> {
  const { data: marshalledHex, error: marshalError } = await tryCatch(
    Promise.resolve(tx.marshalHex())
  );

  if (marshalError) {
    logger.error('Error marshalling XRP transaction', { error: marshalError });
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
 * Builds an unsigned XRP native transaction
 */
export async function buildXrpNativeTransaction(
  params: XrpNativeParams
): Promise<BuildTransactionResult> {
  const { wallet, chain, amount, to, memo, tag } = params;

  const { data: tx, error: txError } = await tryCatch(
    chain.TransactionBuilder.buildTransaction({
      amount,
      from: wallet,
      to,
      tag: tag ? Number.parseInt(tag, 10) : undefined,
      memo,
    })
  );

  if (txError) {
    logger.error('Error building XRP native transaction', { error: txError });
    const errorMessage = (txError?.message || '').toLowerCase();
    buildTransactionErrorToHttpError(errorMessage, knownErrors);
  }

  if (!tx) {
    logger.error('Failed to build XRP native transaction: no transaction returned');
    throw new InternalServerError('Failed to build transaction');
  }

  return marshalTransaction(tx);
}
