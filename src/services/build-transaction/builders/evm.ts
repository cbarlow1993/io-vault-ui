import { InternalServerError } from '@iofinnet/errors-sdk';
import type {
  Chain,
  EvmTransaction,
  EvmTransactionBuilder,
  EvmWallet,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { BigNumber } from 'bignumber.js';
import { logger } from '@/utils/powertools.js';
import { tryCatch } from '@/utils/try-catch.js';
import { buildTransactionErrorToHttpError } from '../error-utils.js';
import type { BuildTransactionResult, KnownError } from '../types.js';

/**
 * Error messages for EVM transactions
 */
export const ERROR_INVALID_SENDER = 'invalid transaction parameters: from address is invalid';
export const ERROR_MISSING_SENDER = 'invalid transaction parameters: from address is required';
export const ERROR_INVALID_RECIPIENT = 'invalid transaction parameters: to address is invalid';
export const ERROR_EMPTY_RECIPIENT =
  "invalid transaction parameters: 'to' address cannot be an empty string";
export const ERROR_MISSING_AMOUNT = 'invalid transaction parameters: amount is required';
export const ERROR_INVALID_AMOUNT = 'invalid or missing `amount` (must be a number)';
export const ERROR_NEGATIVE_AMOUNT = 'invalid amount: must be greater than or equal to zero';
export const ERROR_ZERO_TRANSFER = 'invalid amount: must be greater than zero for eth transfer';
export const ERROR_INSUFFICIENT_BALANCE = 'insufficient balance: account cannot cover transaction';
export const ERROR_INSUFFICIENT_BALANCE_FOR_FEES =
  'insufficient balance: account cannot cover transactionfees';
export const ERROR_MISSING_CLIENT = 'evm client not available for building transaction';
export const ERROR_FAILED_GAS_ESTIMATE = 'failed to estimate gas for transaction';
export const ERROR_FAILED_NONCE = 'failed to get transaction count (nonce)';
export const ERROR_FAILED_PRIORITY_FEE = 'failed to estimate maxpriorityfeepergas';
export const ERROR_FAILED_GAS_PRICE = 'failed to get current gas price';
export const ERROR_INVALID_ACCESS_LIST =
  'accesslist provided for a legacy transaction type. it will likely be ignored';
export const ERROR_FAILED_UNMARSHAL = 'failed to unmarshal transaction from hex';
export const ERROR_INVALID_SIGNATURE = 'invalid signature length for evm';
export const ERROR_MISSING_SIGNATURE = 'missing signature';
export const ERROR_UNSIGNED_TRANSACTION = 'transaction not signed';
export const ERROR_TOTAL_COST_EXCEEDS_BALANCE =
  'the total cost (gas * gas fee + value) of executing this transaction exceeds the balance of the account';
export const ERROR_TOTAL_COST_EXCEEDS_TOKEN_BALANCE =
  'execution reverted with reason: erc20: transfer amount exceeds balance';
export const ERROR_ARITHMETIC_UNDERFLOW_OR_OVERFLOW =
  'execution reverted with reason: arithmetic underflow or overflow';
export const ERROR_TOKEN_BALANCE = 'token balance not found for token';

/**
 * Known EVM transaction errors mapped to HTTP error responses
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
    ERROR_MISSING_SENDER,
    {
      status: 400,
      message: 'The sender address is required',
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
    ERROR_EMPTY_RECIPIENT,
    {
      status: 400,
      message: 'The recipient address cannot be an empty string',
      path: ['to'],
    },
  ],
  [
    ERROR_MISSING_AMOUNT,
    {
      status: 400,
      message: 'The amount is required',
      path: ['amount'],
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
      message: 'Amount must be greater than or equal to zero',
      path: ['amount'],
    },
  ],
  [
    ERROR_ZERO_TRANSFER,
    {
      status: 400,
      message: 'Amount must be greater than zero for ETH transfer',
      path: ['amount'],
    },
  ],
  [
    ERROR_INSUFFICIENT_BALANCE_FOR_FEES,
    {
      status: 400,
      message: 'Insufficient balance: Account cannot cover transaction fees',
      path: ['amount'],
    },
  ],
  [
    ERROR_INSUFFICIENT_BALANCE,
    {
      status: 400,
      message: 'Insufficient balance: Account cannot cover transaction',
      path: ['amount'],
    },
  ],
  [
    ERROR_TOKEN_BALANCE,
    {
      status: 400,
      message: 'Insufficient balance: token balance not found for token address',
      path: ['tokenAddress'],
    },
  ],
  [
    ERROR_INVALID_ACCESS_LIST,
    {
      status: 500,
      message: 'AccessList provided for a legacy transaction type. It will likely be ignored',
    },
  ],
  [
    ERROR_INVALID_SIGNATURE,
    {
      status: 500,
      message: 'Invalid signature length for EVM',
    },
  ],
  [
    ERROR_MISSING_SIGNATURE,
    {
      status: 500,
      message: 'Missing signature',
    },
  ],
  [
    ERROR_UNSIGNED_TRANSACTION,
    {
      status: 500,
      message: 'Transaction not signed',
    },
  ],
  [
    ERROR_MISSING_CLIENT,
    {
      status: 500,
      message: 'EVM client not available for building transaction',
    },
  ],
  [
    ERROR_FAILED_GAS_ESTIMATE,
    {
      status: 500,
      message: 'Failed to estimate gas for transaction',
    },
  ],
  [
    ERROR_FAILED_NONCE,
    {
      status: 500,
      message: 'Failed to get transaction count (nonce)',
    },
  ],
  [
    ERROR_FAILED_PRIORITY_FEE,
    {
      status: 500,
      message: 'Failed to estimate maxPriorityFeePerGas',
    },
  ],
  [
    ERROR_FAILED_GAS_PRICE,
    {
      status: 500,
      message: 'Failed to get current gas price',
    },
  ],
  [
    ERROR_FAILED_UNMARSHAL,
    {
      status: 500,
      message: 'Failed to unmarshal transaction from hex',
    },
  ],
  [
    ERROR_TOTAL_COST_EXCEEDS_BALANCE,
    {
      status: 400,
      message: 'total transaction cost (gas + amount) exceeds account balance',
      path: ['amount'],
    },
  ],
  [
    ERROR_TOTAL_COST_EXCEEDS_TOKEN_BALANCE,
    {
      status: 400,
      message: 'erc20: transfer amount exceeds balance',
      path: ['amount'],
    },
  ],
  [
    ERROR_ARITHMETIC_UNDERFLOW_OR_OVERFLOW,
    {
      status: 400,
      message: 'erc20: transfer amount exceeds balance',
      path: ['amount'],
    },
  ],
]);

/**
 * Parameters for building EVM native transactions
 */
export interface EvmNativeParams {
  wallet: EvmWallet;
  chain: Chain;
  amount: string;
  to: string;
  gasPrice?: string;
  gasLimit?: string;
  nonce?: number;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  type?: number;
  data?: string;
}

/**
 * Parameters for building EVM token transactions
 */
export interface EvmTokenParams extends EvmNativeParams {
  tokenAddress: string;
}

/**
 * Converts gasPrice from GWEI to WEI
 * @param gasPriceGwei - Gas price in GWEI (can be fractional)
 * @returns Gas price in WEI as a string, or undefined if input is undefined
 */
function convertGweiToWei(gasPriceGwei: string | undefined): string | undefined {
  if (gasPriceGwei === undefined || gasPriceGwei.trim() === '') {
    return undefined;
  }
  return new BigNumber(gasPriceGwei).multipliedBy(1e9).toString();
}

/**
 * Marshals transaction and extracts EIP712 details
 */
async function marshalTransaction(tx: EvmTransaction): Promise<BuildTransactionResult> {
  const { data: marshalledHex, error: marshalError } = await tryCatch(
    Promise.resolve(tx.marshalHex())
  );

  if (marshalError) {
    logger.error('Error marshalling EVM transaction', { error: marshalError });
    throw new InternalServerError('Error marshalling transaction');
  }

  const { data: details, error: detailsError } = await tryCatch(tx.toEIP712Details());

  if (detailsError) {
    logger.error('Error getting EIP712 details', { error: detailsError });
    throw new InternalServerError('Error getting transaction details');
  }

  return { marshalledHex: marshalledHex!, details: details! };
}

/**
 * Builds an unsigned EVM native (ETH) transaction
 */
export async function buildEvmNativeTransaction(params: EvmNativeParams): Promise<BuildTransactionResult> {
  const {
    wallet,
    chain,
    amount,
    to,
    gasPrice,
    gasLimit,
    nonce,
    maxFeePerGas,
    maxPriorityFeePerGas,
    type,
    data,
  } = params;

  const gasPriceWei = convertGweiToWei(gasPrice);

  const { data: tx, error: txError } = await tryCatch(
    (chain.TransactionBuilder as EvmTransactionBuilder).buildNativeTransaction({
      amount,
      from: wallet,
      to: to as `0x${string}`,
      gasPrice: gasPriceWei,
      gasLimit,
      nonce,
      maxFeePerGas,
      maxPriorityFeePerGas,
      type,
      data: data as `0x${string}`,
    })
  );

  if (txError) {
    logger.error('Error building EVM native transaction', { error: txError });
    const errorMessage = (txError?.message || '').toLowerCase();
    buildTransactionErrorToHttpError(errorMessage, knownErrors);
  }

  if (!tx) {
    logger.error('Failed to build EVM native transaction: no transaction returned');
    throw new InternalServerError('Failed to build transaction');
  }

  return marshalTransaction(tx);
}

/**
 * Builds an unsigned EVM token (ERC20) transaction
 */
export async function buildEvmTokenTransaction(params: EvmTokenParams): Promise<BuildTransactionResult> {
  const {
    wallet,
    chain,
    amount,
    to,
    tokenAddress,
    gasPrice,
    gasLimit,
    nonce,
    maxFeePerGas,
    maxPriorityFeePerGas,
    type,
    data,
  } = params;

  const gasPriceWei = convertGweiToWei(gasPrice);

  const { data: tx, error: txError } = await tryCatch(
    (chain.TransactionBuilder as EvmTransactionBuilder).buildTokenTransaction({
      amount,
      from: wallet,
      to: to as `0x${string}`,
      tokenAddress: tokenAddress as `0x${string}`,
      gasPrice: gasPriceWei,
      gasLimit,
      nonce,
      maxFeePerGas,
      maxPriorityFeePerGas,
      type,
      data: data as `0x${string}`,
    })
  );

  if (txError) {
    logger.error('Error building EVM token transaction', { error: txError });
    const errorMessage = (txError?.message || '').toLowerCase();
    buildTransactionErrorToHttpError(errorMessage, knownErrors);
  }

  if (!tx) {
    logger.error('Failed to build EVM token transaction: no transaction returned');
    throw new InternalServerError('Failed to build transaction');
  }

  return marshalTransaction(tx);
}
