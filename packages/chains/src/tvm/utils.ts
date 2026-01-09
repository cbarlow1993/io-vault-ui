// packages/chains/src/tvm/utils.ts

import { createHash } from 'crypto';

// ============ SHA256 Hashing ============

/**
 * Compute SHA256 hash
 */
export function sha256(data: Uint8Array | Buffer): Buffer {
  return createHash('sha256').update(data).digest();
}

/**
 * Compute double SHA256 hash (SHA256 of SHA256)
 * Used for TRON address checksum
 */
export function doubleSha256(data: Uint8Array | Buffer): Buffer {
  return sha256(sha256(data));
}

// ============ Constants ============

export const SUN_PER_TRX = 1_000_000n; // 1 TRX = 1,000,000 SUN
export const TRX_DECIMALS = 6;

// TRON address constants
export const TRON_ADDRESS_PREFIX = 0x41; // 'T' in base58check
export const TRON_ADDRESS_LENGTH = 34; // Base58Check encoded length
export const TRON_HEX_ADDRESS_LENGTH = 42; // Hex address with '41' prefix

// Contract types
export const CONTRACT_TYPES = {
  TRANSFER: 'TransferContract',
  TRC20_TRANSFER: 'TriggerSmartContract',
  TRANSFER_ASSET: 'TransferAssetContract',
  CREATE_SMART_CONTRACT: 'CreateSmartContract',
  TRIGGER_SMART_CONTRACT: 'TriggerSmartContract',
  FREEZE_BALANCE_V2: 'FreezeBalanceV2Contract',
  UNFREEZE_BALANCE_V2: 'UnfreezeBalanceV2Contract',
  DELEGATE_RESOURCE: 'DelegateResourceContract',
  UNDELEGATE_RESOURCE: 'UnDelegateResourceContract',
} as const;

export type ContractType = (typeof CONTRACT_TYPES)[keyof typeof CONTRACT_TYPES];

// ============ Unit Conversion ============

/**
 * Format SUN to TRX string
 * @param sun - Amount in SUN (smallest unit)
 * @param decimals - Number of decimal places (default 6)
 * @returns Formatted TRX string
 */
export function formatSun(sun: bigint, decimals: number = TRX_DECIMALS): string {
  const isNegative = sun < 0n;
  const absoluteSun = isNegative ? -sun : sun;
  const divisor = 10n ** BigInt(decimals);

  const wholePart = absoluteSun / divisor;
  const fractionalPart = absoluteSun % divisor;

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').replace(/0+$/, '');
  const sign = isNegative ? '-' : '';

  if (fractionalStr === '') {
    return `${sign}${wholePart}`;
  }

  return `${sign}${wholePart}.${fractionalStr}`;
}

/**
 * Parse TRX string to SUN
 * @param trx - TRX amount as string
 * @param decimals - Number of decimal places (default 6)
 * @returns Amount in SUN as bigint
 */
export function parseSun(trx: string, decimals: number = TRX_DECIMALS): bigint {
  // Handle negative values
  const isNegative = trx.startsWith('-');
  const absValue = isNegative ? trx.slice(1) : trx;

  const [wholePart = '0', fractionalPart = ''] = absValue.split('.');
  // Handle values like ".5" where wholePart would be empty string
  const normalizedWhole = wholePart === '' ? '0' : wholePart;
  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);

  const wholeInSun = BigInt(normalizedWhole) * 10n ** BigInt(decimals);
  const fractionalInSun = BigInt(paddedFractional);
  const result = wholeInSun + fractionalInSun;

  return isNegative ? -result : result;
}

// ============ Address Utilities ============

// Base58 alphabet used by TRON
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Decode a base58 string to bytes
 */
function base58Decode(str: string): Uint8Array {
  const bytes: number[] = [0];

  for (const char of str) {
    const index = BASE58_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid base58 character: ${char}`);
    }

    let carry = index;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i]! * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Add leading zeros
  for (const char of str) {
    if (char === '1') {
      bytes.push(0);
    } else {
      break;
    }
  }

  return new Uint8Array(bytes.reverse());
}

/**
 * Encode bytes to base58 string
 */
function base58Encode(bytes: Uint8Array): string {
  const digits: number[] = [0];

  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i]! * 256;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }

    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  // Add leading zeros
  for (const byte of bytes) {
    if (byte === 0) {
      digits.push(0);
    } else {
      break;
    }
  }

  return digits
    .reverse()
    .map((d) => BASE58_ALPHABET[d])
    .join('');
}

/**
 * Validate a TRON address
 * @param address - Address to validate (base58check format starting with 'T')
 * @returns true if valid TRON address
 */
export function isValidTronAddress(address: string): boolean {
  // Must start with 'T' and be 34 characters
  if (!address.startsWith('T') || address.length !== TRON_ADDRESS_LENGTH) {
    return false;
  }

  // Check base58 characters
  for (const char of address) {
    if (!BASE58_ALPHABET.includes(char)) {
      return false;
    }
  }

  try {
    // Decode and verify checksum
    const decoded = base58Decode(address);
    if (decoded.length !== 25) {
      return false;
    }

    // First byte should be 0x41
    if (decoded[0] !== TRON_ADDRESS_PREFIX) {
      return false;
    }

    // Verify checksum: first 4 bytes of double SHA256 of address bytes
    const addressBytes = decoded.slice(0, 21);
    const providedChecksum = decoded.slice(21, 25);
    const computedChecksum = doubleSha256(addressBytes).slice(0, 4);

    // Compare checksums byte by byte
    for (let i = 0; i < 4; i++) {
      if (providedChecksum[i] !== computedChecksum[i]) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Convert TRON base58 address to hex format
 * @param base58Address - Address in base58check format (T...)
 * @returns Hex address without '0x' prefix
 */
export function addressToHex(base58Address: string): string {
  if (!isValidTronAddress(base58Address)) {
    throw new Error(`Invalid TRON address: ${base58Address}`);
  }

  const decoded = base58Decode(base58Address);
  // Remove checksum (last 4 bytes) and return hex
  const addressBytes = decoded.slice(0, 21);
  return Buffer.from(addressBytes).toString('hex');
}

/**
 * Convert hex address to TRON base58 format
 * @param hexAddress - Hex address (with or without 0x prefix, with or without 41 prefix)
 * @returns Base58check address (T...)
 */
export function hexToAddress(hexAddress: string): string {
  // Remove 0x prefix if present
  let hex = hexAddress.startsWith('0x') ? hexAddress.slice(2) : hexAddress;

  // Add 41 prefix if not present
  if (!hex.startsWith('41') && hex.length === 40) {
    hex = '41' + hex;
  }

  if (hex.length !== TRON_HEX_ADDRESS_LENGTH) {
    throw new Error(`Invalid hex address length: ${hex.length}`);
  }

  const addressBytes = Buffer.from(hex, 'hex');

  // Compute checksum: first 4 bytes of double SHA256
  const checksum = doubleSha256(addressBytes).slice(0, 4);

  const fullBytes = Buffer.concat([addressBytes, checksum]);
  return base58Encode(new Uint8Array(fullBytes));
}

/**
 * Check if an address is a hex address
 */
export function isHexAddress(address: string): boolean {
  const hex = address.startsWith('0x') ? address.slice(2) : address;
  return /^(41)?[0-9a-fA-F]{40}$/.test(hex);
}

// ============ Contract Data Utilities ============

/**
 * Encode TRC20 transfer data
 * @param to - Recipient address (hex format without 41 prefix)
 * @param amount - Amount in smallest units
 * @returns Encoded function call data
 */
export function encodeTrc20Transfer(to: string, amount: bigint): string {
  // transfer(address,uint256) selector: a9059cbb
  const selector = 'a9059cbb';

  // Pad address to 32 bytes (remove 41 prefix if present)
  let toHex = to.startsWith('41') ? to.slice(2) : to;
  toHex = toHex.startsWith('0x') ? toHex.slice(2) : toHex;
  const paddedTo = toHex.toLowerCase().padStart(64, '0');

  // Pad amount to 32 bytes
  const paddedAmount = amount.toString(16).padStart(64, '0');

  return selector + paddedTo + paddedAmount;
}

/**
 * Decode TRC20 transfer data
 * @param data - Encoded function call data
 * @returns Decoded transfer info or null if not a transfer
 */
export function decodeTrc20Transfer(data: string): { to: string; amount: bigint } | null {
  const hex = data.startsWith('0x') ? data.slice(2) : data;

  // Check for transfer selector
  if (!hex.startsWith('a9059cbb') || hex.length !== 136) {
    return null;
  }

  const toHex = '41' + hex.slice(32, 72);
  const amountHex = hex.slice(72, 136);

  return {
    to: toHex,
    amount: BigInt('0x' + amountHex),
  };
}

/**
 * Encode contract call data for balanceOf(address)
 */
export function encodeBalanceOf(address: string): string {
  // balanceOf(address) selector: 70a08231
  const selector = '70a08231';

  // Convert to hex and remove 41 prefix
  let addressHex: string;
  if (address.startsWith('T')) {
    addressHex = addressToHex(address).slice(2); // Remove 41 prefix
  } else {
    addressHex = address.startsWith('41') ? address.slice(2) : address;
    addressHex = addressHex.startsWith('0x') ? addressHex.slice(2) : addressHex;
  }

  const paddedAddress = addressHex.toLowerCase().padStart(64, '0');
  return selector + paddedAddress;
}

/**
 * Encode contract call data for decimals()
 */
export function encodeDecimals(): string {
  return '313ce567'; // decimals() selector
}

/**
 * Encode contract call data for symbol()
 */
export function encodeSymbol(): string {
  return '95d89b41'; // symbol() selector
}

// ============ Transaction Utilities ============

/**
 * Estimate bandwidth points for a transaction
 * @param txSize - Transaction size in bytes
 * @returns Estimated bandwidth points
 */
export function estimateBandwidth(txSize: number): number {
  // 1 bandwidth point = 1 byte
  return txSize;
}

/**
 * Estimate energy for a smart contract call
 * @param isSimpleTransfer - Whether this is a simple TRX transfer
 * @returns Estimated energy (0 for simple transfers)
 */
export function estimateEnergy(isSimpleTransfer: boolean): number {
  if (isSimpleTransfer) {
    return 0; // TRX transfers don't consume energy
  }
  // TRC20 transfers typically consume ~15,000-30,000 energy
  return 30000;
}

/**
 * Calculate fee limit for a transaction
 * @param energy - Estimated energy consumption
 * @param energyPrice - Price per energy unit in SUN (default: 420 SUN)
 * @returns Fee limit in SUN
 */
export function calculateFeeLimit(energy: number, energyPrice: number = 420): bigint {
  return BigInt(energy) * BigInt(energyPrice);
}
