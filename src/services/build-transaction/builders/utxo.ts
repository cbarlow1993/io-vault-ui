import { InternalServerError } from '@iofinnet/errors-sdk';
import {
  BitcoinTransaction,
  type BitcoinWallet,
  type Chain,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import BigNumber from 'bignumber.js';
import { logger } from '@/utils/powertools.js';
import { tryCatch } from '@/utils/try-catch.js';
import { Adamik, AdamikService } from '@/src/services/adamik.js';
import { validatePsbt } from '@/src/services/psbt/validatePsbt.js';
import { buildTransactionErrorToHttpError } from '../error-utils.js';
import type { BuildTransactionResult, KnownError } from '../types.js';

/**
 * BTC dust limit: 546 satoshis (0.00000546 BTC)
 */
const BTC_DUST_LIMIT_SATOSHIS = 546;
const SATOSHIS_PER_BTC = 1e8;

/**
 * Error messages for UTXO transactions
 */
export const ERROR_INVALID_SENDER = 'invalid sender address';
export const ERROR_INVALID_RECIPIENT = 'invalid recipient address';
export const ERROR_INVALID_AMOUNT = 'invalid amount: must be a positive number';
export const ERROR_BELOW_DUST_LIMIT = 'amount is below dust limit';
export const ERROR_INSUFFICIENT_BALANCE = 'insufficient balance';
export const ERROR_INSUFFICIENT_UTXOS = 'insufficient utxos';
export const ERROR_INVALID_PSBT = 'invalid psbt hex';
export const ERROR_PSBT_NO_INPUTS = 'psbt must have at least one input';
export const ERROR_PSBT_NO_OUTPUTS = 'psbt must have at least one output';
export const ERROR_PSBT_MISMATCH = 'psbt does not match expected values';
export const ERROR_FAILED_ENCODE = 'adamik api error';
export const ERROR_FAILED_MARSHAL = 'error marshalling transaction';

/**
 * Known UTXO transaction errors mapped to HTTP error responses
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
    ERROR_INVALID_AMOUNT,
    {
      status: 400,
      message: 'Invalid amount: must be a positive number',
      path: ['amount'],
    },
  ],
  [
    ERROR_BELOW_DUST_LIMIT,
    {
      status: 400,
      message: `Amount is below dust limit. Minimum amount is ${new BigNumber(BTC_DUST_LIMIT_SATOSHIS).dividedBy(SATOSHIS_PER_BTC).toString()} BTC (${BTC_DUST_LIMIT_SATOSHIS} satoshis)`,
      path: ['amount'],
    },
  ],
  [
    ERROR_INSUFFICIENT_BALANCE,
    {
      status: 400,
      message: 'Insufficient balance to complete the transaction',
      path: ['amount'],
    },
  ],
  [
    ERROR_INSUFFICIENT_UTXOS,
    {
      status: 400,
      message: 'Insufficient UTXOs to complete the transaction',
      path: ['amount'],
    },
  ],
  [
    ERROR_INVALID_PSBT,
    {
      status: 500,
      message: 'Failed to parse PSBT data',
    },
  ],
  [
    ERROR_PSBT_NO_INPUTS,
    {
      status: 500,
      message: 'PSBT must have at least one input',
    },
  ],
  [
    ERROR_PSBT_NO_OUTPUTS,
    {
      status: 500,
      message: 'PSBT must have at least one output',
    },
  ],
  [
    ERROR_PSBT_MISMATCH,
    {
      status: 500,
      message: 'PSBT does not match expected transaction values',
    },
  ],
  [
    ERROR_FAILED_ENCODE,
    {
      status: 500,
      message: 'Failed to encode transaction',
    },
  ],
  [
    ERROR_FAILED_MARSHAL,
    {
      status: 500,
      message: 'Failed to marshal transaction',
    },
  ],
]);

/**
 * Parameters for building UTXO native transactions
 */
export interface UtxoNativeParams {
  wallet: BitcoinWallet;
  chain: Chain;
  amount: string;
  to: string;
  feeRate?: string;
  utxos?: Array<{ txid: string; vout: number; value: number }>;
}

/**
 * Builds an unsigned UTXO (Bitcoin) native transaction
 */
export async function buildUtxoNativeTransaction(
  params: UtxoNativeParams
): Promise<BuildTransactionResult> {
  const { wallet, chain, amount, to } = params;

  let amountInSatoshis: BigNumber | undefined;
  let useMaxAmount = false;

  if (amount.toUpperCase() === 'MAX') {
    useMaxAmount = true;
  } else {
    const amountBN = new BigNumber(amount);

    if (amountBN.isNaN() || amountBN.lte(0)) {
      logger.error('Invalid amount for UTXO transaction', { amount });
      buildTransactionErrorToHttpError(ERROR_INVALID_AMOUNT, knownErrors);
    }

    amountInSatoshis = amountBN.multipliedBy(SATOSHIS_PER_BTC);

    if (amountInSatoshis.lt(BTC_DUST_LIMIT_SATOSHIS)) {
      logger.error('Amount below dust limit', { amount, satoshis: amountInSatoshis.toString() });
      buildTransactionErrorToHttpError(ERROR_BELOW_DUST_LIMIT, knownErrors);
    }
  }

  const transferParams: Adamik.TransferRequest = {
    recipientAddress: to,
    senderAddress: wallet.getAddress(),
    senderPubKey: wallet.getPublicKey(),
    mode: 'transfer',
    ...(useMaxAmount ? { useMaxAmount: true } : { amount: amountInSatoshis!.toFixed(0) }),
  };

  const { data: encodedTx, error: txError } = await tryCatch(
    AdamikService.transfer(chain.Alias, transferParams)
  );

  if (txError) {
    logger.error('Error building transaction with Adamik service', { error: txError });
    const errorMessage = (txError?.message || '').toLowerCase();
    buildTransactionErrorToHttpError(errorMessage, knownErrors);
  }

  if (!encodedTx) {
    logger.error('No encoded transaction returned from Adamik');
    throw new InternalServerError('Failed to build transaction');
  }

  if (encodedTx.status.errors && encodedTx.status.errors.length > 0) {
    logger.error('Adamik returned errors', { errors: encodedTx.status.errors });
    const errorMessage = encodedTx.status.errors[0]?.message || 'Unknown error';
    buildTransactionErrorToHttpError(errorMessage.toLowerCase(), knownErrors);
  }

  const hexPsbt = encodedTx.transaction.encoded[0]?.raw.value;

  if (!hexPsbt) {
    logger.error('No PSBT hex in Adamik response');
    throw new InternalServerError('Failed to build transaction: missing PSBT');
  }

  // Validate PSBT matches expected values
  const validationAmount = amountInSatoshis ? BigInt(amountInSatoshis.toString()) : undefined;

  const { error: validateError } = await tryCatch(
    Promise.resolve(
      validatePsbt({
        psbtHex: hexPsbt,
        expected: { to, from: wallet.getAddress(), amount: validationAmount },
      })
    )
  );

  if (validateError) {
    logger.error('PSBT validation failed', { error: validateError });
    const errorMessage = (validateError?.message || '').toLowerCase();
    buildTransactionErrorToHttpError(errorMessage, knownErrors);
  }

  const tx = new BitcoinTransaction(chain, wallet.getPublicKey(), hexPsbt, wallet);

  const { data: marshalledHex, error: marshalError } = await tryCatch(
    Promise.resolve(tx.marshalHex())
  );

  if (marshalError) {
    logger.error('Error marshalling UTXO transaction', { error: marshalError });
    throw new InternalServerError('Error marshalling transaction');
  }

  const { data: details, error: detailsError } = await tryCatch(tx.toEIP712Details());

  if (detailsError) {
    logger.error('Error getting transaction details', { error: detailsError });
    throw new InternalServerError('Error getting transaction details');
  }

  return { marshalledHex: marshalledHex!, details: details! };
}
