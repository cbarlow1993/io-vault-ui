// packages/chains/src/evm/utils.ts

import {
  keccak256 as viemKeccak256,
  toHex,
  toBytes,
  isAddress as viemIsAddress,
  getAddress,
  getContractAddress as viemGetContractAddress,
  serializeTransaction as viemSerializeTransaction,
  type TransactionSerializable,
  type Hex,
} from 'viem';

// Re-export viem utilities for use across the module
export { viemKeccak256 as keccak256, viemIsAddress as isAddress, getAddress };

/**
 * Compute keccak256 hash of a hex string or bytes
 */
export function computeKeccak256(data: Hex | Uint8Array): Hex {
  return viemKeccak256(data);
}

/**
 * Validate an Ethereum address
 */
export function validateAddress(address: string): address is `0x${string}` {
  return viemIsAddress(address);
}

/**
 * Compute CREATE contract address (sender + nonce)
 */
export function computeContractAddress(sender: `0x${string}`, nonce: bigint): `0x${string}` {
  return viemGetContractAddress({ from: sender, nonce });
}

/**
 * Serialize a transaction for signing or broadcasting
 */
export function serializeTransaction(tx: TransactionSerializable, signature?: { r: Hex; s: Hex; v: bigint }): Hex {
  if (signature) {
    return viemSerializeTransaction(tx, signature);
  }
  return viemSerializeTransaction(tx);
}

/**
 * Compute transaction hash from serialized transaction
 */
export function computeTransactionHash(serializedTx: Hex): Hex {
  return viemKeccak256(serializedTx);
}

export function formatUnits(value: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const integerPart = value / divisor;
  const remainder = value % divisor;

  if (remainder === 0n) {
    return integerPart.toString();
  }

  const remainderStr = remainder.toString().padStart(decimals, '0');
  const trimmedRemainder = remainderStr.replace(/0+$/, '');

  return `${integerPart}.${trimmedRemainder}`;
}

export function parseUnits(value: string, decimals: number): bigint {
  // Handle negative values
  const isNegative = value.startsWith('-');
  const absValue = isNegative ? value.slice(1) : value;

  const [integerPart = '0', fractionalPart = ''] = absValue.split('.');
  // Default to '0' if integer part is empty (e.g., ".5" -> "0.5")
  const normalizedInteger = integerPart === '' ? '0' : integerPart;
  const paddedFraction = fractionalPart.slice(0, decimals).padEnd(decimals, '0');
  const result = BigInt(normalizedInteger + paddedFraction);

  return isNegative ? -result : result;
}
