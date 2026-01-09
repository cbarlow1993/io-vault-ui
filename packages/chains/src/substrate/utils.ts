// packages/chains/src/substrate/utils.ts

import { blake2b } from '@noble/hashes/blake2b';

// SS58 constants
export const SS58_PREFIX = new Uint8Array([0x53, 0x53, 0x35, 0x38, 0x50, 0x52, 0x45]); // "SS58PRE"
export const SUBSTRATE_DECIMALS = 9; // Bittensor uses 9 decimals

// Base58 alphabet for SS58 encoding
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Encode bytes to Base58
 */
export function encodeBase58(bytes: Uint8Array): string {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      const digit = digits[i] ?? 0;
      carry += digit << 8;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  // Handle leading zeros
  let leadingZeros = 0;
  for (const byte of bytes) {
    if (byte === 0) leadingZeros++;
    else break;
  }
  return '1'.repeat(leadingZeros) + digits.reverse().map((d) => BASE58_ALPHABET[d] ?? '').join('');
}

/**
 * Decode Base58 to bytes
 */
export function decodeBase58(str: string): Uint8Array {
  const bytes = [0];
  for (const char of str) {
    const index = BASE58_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base58 character: ${char}`);
    }
    let carry = index;
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i] ?? 0;
      carry += byte * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Handle leading '1's
  let leadingOnes = 0;
  for (const char of str) {
    if (char === '1') leadingOnes++;
    else break;
  }
  const result = new Uint8Array(leadingOnes + bytes.length);
  result.set(bytes.reverse(), leadingOnes);
  return result;
}

/**
 * Calculate SS58 checksum
 */
function ss58Checksum(data: Uint8Array): Uint8Array {
  const input = new Uint8Array(SS58_PREFIX.length + data.length);
  input.set(SS58_PREFIX);
  input.set(data, SS58_PREFIX.length);
  const hash = blake2b(input, { dkLen: 64 });
  return hash.slice(0, 2);
}

/**
 * Encode a public key to SS58 address
 */
export function encodeAddress(publicKey: Uint8Array, ss58Prefix: number = 42): string {
  if (publicKey.length !== 32) {
    throw new Error('Invalid public key length: expected 32 bytes');
  }

  let prefixBytes: Uint8Array;
  if (ss58Prefix < 64) {
    prefixBytes = new Uint8Array([ss58Prefix]);
  } else if (ss58Prefix < 16384) {
    prefixBytes = new Uint8Array([
      ((ss58Prefix & 0xfc) >> 2) | 0x40,
      (ss58Prefix >> 8) | ((ss58Prefix & 0x03) << 6),
    ]);
  } else {
    throw new Error('SS58 prefix too large');
  }

  const payload = new Uint8Array(prefixBytes.length + publicKey.length);
  payload.set(prefixBytes);
  payload.set(publicKey, prefixBytes.length);

  const checksum = ss58Checksum(payload);
  const full = new Uint8Array(payload.length + 2);
  full.set(payload);
  full.set(checksum, payload.length);

  return encodeBase58(full);
}

/**
 * Decode an SS58 address to public key
 */
export function decodeAddress(address: string): { publicKey: Uint8Array; ss58Prefix: number } {
  const decoded = decodeBase58(address);

  if (decoded.length < 35) {
    throw new Error('Invalid SS58 address: too short');
  }

  // Determine prefix length
  let prefixLength: number;
  let ss58Prefix: number;

  const firstByte = decoded[0] ?? 0;
  const secondByte = decoded[1] ?? 0;

  if ((firstByte & 0x40) === 0) {
    // Simple prefix (0-63)
    prefixLength = 1;
    ss58Prefix = firstByte;
  } else {
    // Two-byte prefix (64-16383)
    prefixLength = 2;
    ss58Prefix = ((firstByte & 0x3f) << 2) | (secondByte >> 6) | ((secondByte & 0x3f) << 8);
  }

  const publicKeyEnd = decoded.length - 2;
  const publicKey = decoded.slice(prefixLength, publicKeyEnd);

  if (publicKey.length !== 32) {
    throw new Error('Invalid SS58 address: invalid public key length');
  }

  // Verify checksum
  const payload = decoded.slice(0, publicKeyEnd);
  const expectedChecksum = ss58Checksum(payload);
  const actualChecksum = decoded.slice(publicKeyEnd);

  if (expectedChecksum[0] !== actualChecksum[0] || expectedChecksum[1] !== actualChecksum[1]) {
    throw new Error('Invalid SS58 address: checksum mismatch');
  }

  return { publicKey, ss58Prefix };
}

/**
 * Validate an SS58 address
 */
export function isValidSubstrateAddress(address: string, expectedPrefix?: number): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  try {
    const { ss58Prefix } = decodeAddress(address);
    if (expectedPrefix !== undefined && ss58Prefix !== expectedPrefix) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Format planck to human-readable amount
 */
export function formatPlanck(planck: bigint, decimals: number = SUBSTRATE_DECIMALS): string {
  const isNegative = planck < 0n;
  const absolutePlanck = isNegative ? -planck : planck;
  const divisor = 10n ** BigInt(decimals);

  const wholePart = absolutePlanck / divisor;
  const fractionalPart = absolutePlanck % divisor;

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').replace(/0+$/, '');
  const sign = isNegative ? '-' : '';

  if (fractionalStr === '') {
    return `${sign}${wholePart}`;
  }

  return `${sign}${wholePart}.${fractionalStr}`;
}

/**
 * Parse human-readable amount to planck
 */
export function parsePlanck(amount: string, decimals: number = SUBSTRATE_DECIMALS): bigint {
  // Handle negative values
  const isNegative = amount.startsWith('-');
  const absValue = isNegative ? amount.slice(1) : amount;

  const [wholePart = '0', fractionalPart = ''] = absValue.split('.');
  // Handle values like ".5" where wholePart would be empty string
  const normalizedWhole = wholePart === '' ? '0' : wholePart;
  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);

  const wholeInPlanck = BigInt(normalizedWhole) * 10n ** BigInt(decimals);
  const fractionalInPlanck = BigInt(paddedFractional);
  const result = wholeInPlanck + fractionalInPlanck;

  return isNegative ? -result : result;
}

/**
 * Compact integer encoding (SCALE codec subset)
 */
export function encodeCompact(value: bigint): Uint8Array {
  if (value < 64n) {
    return new Uint8Array([Number(value) << 2]);
  } else if (value < 16384n) {
    const v = Number(value);
    return new Uint8Array([(v << 2) | 0x01, v >> 6]);
  } else if (value < 1073741824n) {
    const v = Number(value);
    return new Uint8Array([(v << 2) | 0x02, v >> 6, v >> 14, v >> 22]);
  } else {
    // Big integer mode
    const bytes: number[] = [];
    let remaining = value;
    while (remaining > 0n) {
      bytes.push(Number(remaining & 0xffn));
      remaining >>= 8n;
    }
    const byteCount = bytes.length;
    return new Uint8Array([((byteCount - 4) << 2) | 0x03, ...bytes]);
  }
}

/**
 * Decode compact integer
 */
export function decodeCompact(bytes: Uint8Array, offset: number = 0): { value: bigint; bytesRead: number } {
  const byte0 = bytes[offset] ?? 0;
  const mode = byte0 & 0x03;

  if (mode === 0) {
    return { value: BigInt(byte0 >> 2), bytesRead: 1 };
  } else if (mode === 1) {
    const byte1 = bytes[offset + 1] ?? 0;
    const value = ((byte0 >> 2) | (byte1 << 6));
    return { value: BigInt(value), bytesRead: 2 };
  } else if (mode === 2) {
    const byte1 = bytes[offset + 1] ?? 0;
    const byte2 = bytes[offset + 2] ?? 0;
    const byte3 = bytes[offset + 3] ?? 0;
    const value =
      (byte0 >> 2) |
      (byte1 << 6) |
      (byte2 << 14) |
      (byte3 << 22);
    return { value: BigInt(value >>> 0), bytesRead: 4 };
  } else {
    const byteCount = (byte0 >> 2) + 4;
    let value = 0n;
    for (let i = 0; i < byteCount; i++) {
      const byte = bytes[offset + 1 + i] ?? 0;
      value |= BigInt(byte) << BigInt(i * 8);
    }
    return { value, bytesRead: 1 + byteCount };
  }
}

/**
 * Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array, withPrefix: boolean = true): string {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return withPrefix ? `0x${hex}` : hex;
}

/**
 * Substrate transaction types
 */
export const SUBSTRATE_TRANSACTION_TYPES = {
  TRANSFER: 'Balances.transferKeepAlive',
  TRANSFER_ALL: 'Balances.transferAll',
  TRANSFER_ALLOW_DEATH: 'Balances.transferAllowDeath',
} as const;

/**
 * Method IDs for common calls (pallet_index, call_index)
 * These are for Bittensor; may differ on other chains
 */
export const BITTENSOR_METHOD_IDS = {
  'Balances.transferKeepAlive': { palletIndex: 5, callIndex: 3 },
  'Balances.transferAllowDeath': { palletIndex: 5, callIndex: 0 },
  'Balances.transferAll': { palletIndex: 5, callIndex: 4 },
} as const;
