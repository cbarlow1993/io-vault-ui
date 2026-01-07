import { InternalServerError } from '@iofinnet/errors-sdk';
import type {
  BittensorWallet,
  Chain,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { logger } from '@/utils/powertools.js';
import { tryCatch } from '@/utils/try-catch.js';
import { buildTransactionErrorToHttpError } from '../error-utils.js';
import type { BuildTransactionResult, KnownError } from '../types.js';

/**
 * Error messages for Substrate (Bittensor) transactions
 */
export const ERROR_INVALID_SENDER = 'invalid sender address';
export const ERROR_INVALID_RECIPIENT = 'invalid recipient address';
export const ERROR_INVALID_DECIMALS = 'tao supports max 9 decimals';
export const ERROR_FAILED_EXTRINSIC = 'polkadot client failed to build transfer extrinsic';
export const ERROR_FAILED_NONCE = 'polkadot client failed to load nonce and build signer payload';
export const ERROR_FAILED_DECODE = 'failed to unmarshal transaction from hex';
export const ERROR_MISSING_EXTRINSIC = 'unable to unmarshal bittensor extrinsic from hex';
export const ERROR_MISSING_PAYLOAD = 'unable to unmarshal bittensor extrinsicpayload from hex';
export const ERROR_MISSING_ADDRESS = 'unable to unmarshal bittensor sendingaddress from hex';
export const ERROR_FAILED_DECODE_EXTRINSIC = 'polkadot client failed to decode extrinsic';
export const ERROR_FAILED_BROADCAST = 'polkadot client failed to broadcast extrinsic';
export const ERROR_FAILED_HISTORY = 'failed to get transaction history for address';

/**
 * Known Substrate transaction errors mapped to HTTP error responses
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
    ERROR_INVALID_DECIMALS,
    {
      status: 400,
      message: 'TAO token transactions support a maximum of 9 decimal places',
      path: ['amount'],
    },
  ],
  [
    ERROR_FAILED_EXTRINSIC,
    {
      status: 500,
      message: 'Failed to create the transaction on the Bittensor network',
    },
  ],
  [
    ERROR_FAILED_NONCE,
    {
      status: 500,
      message: 'Failed to get the next transaction sequence number',
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
    ERROR_MISSING_EXTRINSIC,
    {
      status: 500,
      message: 'The transaction data is missing or invalid',
    },
  ],
  [
    ERROR_MISSING_PAYLOAD,
    {
      status: 500,
      message: 'The transaction payload is missing or invalid',
    },
  ],
  [
    ERROR_MISSING_ADDRESS,
    {
      status: 500,
      message: 'The sender address is missing or invalid',
    },
  ],
  [
    ERROR_FAILED_DECODE_EXTRINSIC,
    {
      status: 500,
      message: 'Failed to decode the transaction data from the network',
    },
  ],
  [
    ERROR_FAILED_BROADCAST,
    {
      status: 500,
      message: 'Failed to broadcast the transaction to the Bittensor network',
    },
  ],
  [
    ERROR_FAILED_HISTORY,
    {
      status: 500,
      message: 'Failed to retrieve transaction history from the network',
    },
  ],
]);

/**
 * Parameters for building Substrate native transactions
 */
export interface SubstrateNativeParams {
  wallet: BittensorWallet;
  chain: Chain;
  amount: string;
  to: string;
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
    logger.error('Error marshalling Substrate transaction', { error: marshalError });
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
 * Builds an unsigned Substrate (Bittensor) native transaction
 */
export async function buildSubstrateNativeTransaction(
  params: SubstrateNativeParams
): Promise<BuildTransactionResult> {
  const { wallet, chain, amount, to } = params;

  const { data: tx, error: txError } = await tryCatch(
    chain.TransactionBuilder.buildTransaction({
      amount,
      from: wallet,
      to,
    })
  );

  if (txError) {
    logger.error('Error building Substrate native transaction', { error: txError });
    const errorMessage = (txError?.message || '').toLowerCase();
    buildTransactionErrorToHttpError(errorMessage, knownErrors);
  }

  if (!tx) {
    logger.error('Failed to build Substrate native transaction: no transaction returned');
    throw new InternalServerError('Failed to build transaction');
  }

  return marshalTransaction(tx);
}
