// packages/chains/src/xrp/utils.ts

import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';

/**
 * XRP constants
 */
export const DROPS_PER_XRP = 1_000_000n;
export const XRP_DECIMALS = 6;

/**
 * XRP Base58 alphabet (different from Bitcoin's)
 */
export const XRP_ALPHABET = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';

/**
 * Transaction types
 */
export const XRP_TRANSACTION_TYPES = {
  PAYMENT: 'Payment',
  TRUST_SET: 'TrustSet',
  OFFER_CREATE: 'OfferCreate',
  OFFER_CANCEL: 'OfferCancel',
  ACCOUNT_SET: 'AccountSet',
  ESCROW_CREATE: 'EscrowCreate',
  ESCROW_FINISH: 'EscrowFinish',
  ESCROW_CANCEL: 'EscrowCancel',
  PAYMENT_CHANNEL_CREATE: 'PaymentChannelCreate',
  PAYMENT_CHANNEL_FUND: 'PaymentChannelFund',
  PAYMENT_CHANNEL_CLAIM: 'PaymentChannelClaim',
  SIGNER_LIST_SET: 'SignerListSet',
  NFT_TOKEN_MINT: 'NFTokenMint',
  NFT_TOKEN_BURN: 'NFTokenBurn',
  NFT_TOKEN_CREATE_OFFER: 'NFTokenCreateOffer',
  NFT_TOKEN_ACCEPT_OFFER: 'NFTokenAcceptOffer',
  NFT_TOKEN_CANCEL_OFFER: 'NFTokenCancelOffer',
} as const;

export type XrpTransactionType = (typeof XRP_TRANSACTION_TYPES)[keyof typeof XRP_TRANSACTION_TYPES];

/**
 * Encode bytes to Base58 (XRP alphabet)
 */
export function encodeBase58(bytes: Uint8Array): string {
  const chars: string[] = [];
  let num = BigInt('0x' + Buffer.from(bytes).toString('hex'));

  while (num > 0n) {
    const remainder = Number(num % 58n);
    const char = XRP_ALPHABET[remainder];
    if (char !== undefined) {
      chars.unshift(char);
    }
    num = num / 58n;
  }

  // Handle leading zeros
  for (const byte of bytes) {
    if (byte === 0) {
      const zeroChar = XRP_ALPHABET[0];
      if (zeroChar !== undefined) {
        chars.unshift(zeroChar);
      }
    } else {
      break;
    }
  }

  return chars.join('') || XRP_ALPHABET[0] || 'r';
}

/**
 * Decode Base58 (XRP alphabet) to bytes
 */
export function decodeBase58(str: string): Uint8Array {
  let num = 0n;

  for (const char of str) {
    const index = XRP_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base58 character: ${char}`);
    }
    num = num * 58n + BigInt(index);
  }

  // Calculate byte length
  const hex = num.toString(16).padStart(2, '0');
  const paddedHex = hex.length % 2 === 0 ? hex : '0' + hex;

  // Count leading zeros in input
  let leadingZeros = 0;
  for (const char of str) {
    if (char === XRP_ALPHABET[0]) {
      leadingZeros++;
    } else {
      break;
    }
  }

  const bytes = Buffer.from(paddedHex, 'hex');
  const result = new Uint8Array(leadingZeros + bytes.length);
  result.set(bytes, leadingZeros);

  return result;
}

/**
 * Compute checksum for XRP address
 */
function computeChecksum(payload: Uint8Array): Uint8Array {
  const hash1 = sha256(payload);
  const hash2 = sha256(hash1);
  return hash2.slice(0, 4);
}

/**
 * Validate an XRP address
 */
export function isValidXrpAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // XRP addresses start with 'r' and are 25-35 characters
  if (!address.startsWith('r') || address.length < 25 || address.length > 35) {
    return false;
  }

  // Check for valid characters
  for (const char of address) {
    if (!XRP_ALPHABET.includes(char)) {
      return false;
    }
  }

  try {
    // Decode and verify checksum
    const decoded = decodeBase58(address);
    if (decoded.length !== 25) {
      return false;
    }

    const payload = decoded.slice(0, 21);
    const checksum = decoded.slice(21, 25);
    const expectedChecksum = computeChecksum(payload);

    return (
      checksum[0] === expectedChecksum[0] &&
      checksum[1] === expectedChecksum[1] &&
      checksum[2] === expectedChecksum[2] &&
      checksum[3] === expectedChecksum[3]
    );
  } catch {
    return false;
  }
}

/**
 * Derive XRP address from public key
 */
export function publicKeyToAddress(publicKey: Uint8Array): string {
  // SHA256 then RIPEMD160
  const sha256Hash = sha256(publicKey);
  const accountId = ripemd160(sha256Hash);

  // Add version byte (0x00 for mainnet)
  const payload = new Uint8Array(21);
  payload[0] = 0x00;
  payload.set(accountId, 1);

  // Add checksum
  const checksum = computeChecksum(payload);
  const addressBytes = new Uint8Array(25);
  addressBytes.set(payload, 0);
  addressBytes.set(checksum, 21);

  return encodeBase58(addressBytes);
}

/**
 * Format drops to XRP
 */
export function formatDrops(drops: bigint, decimals: number = XRP_DECIMALS): string {
  const isNegative = drops < 0n;
  const absDrops = isNegative ? -drops : drops;
  const divisor = 10n ** BigInt(decimals);

  const wholePart = absDrops / divisor;
  const fractionalPart = absDrops % divisor;

  const sign = isNegative ? '-' : '';

  if (fractionalPart === 0n) {
    return `${sign}${wholePart.toString()}`;
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${sign}${wholePart}.${fractionalStr}`;
}

/**
 * Parse XRP to drops
 */
export function parseDrops(xrp: string, decimals: number = XRP_DECIMALS): bigint {
  // Handle negative values
  const isNegative = xrp.startsWith('-');
  const absValue = isNegative ? xrp.slice(1) : xrp;

  const [wholePart = '0', fractionalPart = ''] = absValue.split('.');
  // Handle values like ".5" where wholePart would be empty string
  const normalizedWhole = wholePart === '' ? '0' : wholePart;
  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);

  const wholeInDrops = BigInt(normalizedWhole) * 10n ** BigInt(decimals);
  const fractionalInDrops = BigInt(paddedFractional);
  const result = wholeInDrops + fractionalInDrops;

  return isNegative ? -result : result;
}

/**
 * Calculate transaction fee in drops
 * Base fee is typically 10-12 drops, but can increase under load
 */
export function calculateBaseFee(loadFactor: number = 1): bigint {
  const baseFee = 12n;
  return baseFee * BigInt(Math.ceil(loadFactor));
}

/**
 * Get current ledger timestamp (Ripple epoch: Jan 1, 2000)
 */
export function rippleTimeNow(): number {
  // Ripple epoch is 946684800 seconds after Unix epoch
  const rippleEpoch = 946684800;
  return Math.floor(Date.now() / 1000) - rippleEpoch;
}

/**
 * Convert Unix timestamp to Ripple timestamp
 */
export function unixToRippleTime(unixSeconds: number): number {
  const rippleEpoch = 946684800;
  return unixSeconds - rippleEpoch;
}

/**
 * Convert Ripple timestamp to Unix timestamp
 */
export function rippleToUnixTime(rippleTime: number): number {
  const rippleEpoch = 946684800;
  return rippleTime + rippleEpoch;
}

/**
 * Encode transaction hash for signing
 */
export function computeSigningHash(txBlob: Uint8Array): Uint8Array {
  // Prefix with hash prefix for signing (0x53545800 = "STX\0")
  const prefix = new Uint8Array([0x53, 0x54, 0x58, 0x00]);
  const prefixed = new Uint8Array(prefix.length + txBlob.length);
  prefixed.set(prefix, 0);
  prefixed.set(txBlob, prefix.length);

  return sha256(sha256(prefixed));
}

/**
 * Compute transaction hash
 */
export function computeTransactionHash(txBlob: Uint8Array): string {
  // Prefix with hash prefix for transaction ID (0x54584E00 = "TXN\0")
  const prefix = new Uint8Array([0x54, 0x58, 0x4e, 0x00]);
  const prefixed = new Uint8Array(prefix.length + txBlob.length);
  prefixed.set(prefix, 0);
  prefixed.set(txBlob, prefix.length);

  const hash = sha256(sha256(prefixed));
  return Buffer.from(hash).toString('hex').toUpperCase();
}

/**
 * Encode amount for XRP transaction
 * For native XRP: string of drops
 * For issued currencies: object with currency, issuer, value
 */
export interface IssuedCurrencyAmount {
  currency: string;
  issuer: string;
  value: string;
}

export type XrpAmount = string | IssuedCurrencyAmount;

/**
 * Check if amount is native XRP
 */
export function isNativeAmount(amount: XrpAmount): amount is string {
  return typeof amount === 'string';
}

/**
 * Check if amount is issued currency
 */
export function isIssuedCurrency(amount: XrpAmount): amount is IssuedCurrencyAmount {
  return typeof amount === 'object' && 'currency' in amount && 'issuer' in amount && 'value' in amount;
}

/**
 * Encode currency code (3-char ISO or 40-char hex)
 */
export function encodeCurrencyCode(currency: string): string {
  if (currency.length === 3) {
    // ISO currency code - pad to 20 bytes with zeros
    const bytes = new Uint8Array(20);
    bytes[12] = currency.charCodeAt(0);
    bytes[13] = currency.charCodeAt(1);
    bytes[14] = currency.charCodeAt(2);
    return Buffer.from(bytes).toString('hex').toUpperCase();
  } else if (currency.length === 40) {
    // Already hex encoded
    return currency.toUpperCase();
  }
  throw new Error(`Invalid currency code: ${currency}`);
}

/**
 * Decode currency code from hex to readable format
 */
export function decodeCurrencyCode(hex: string): string {
  if (hex.length !== 40) {
    return hex;
  }

  const bytes = Buffer.from(hex, 'hex');

  // Check if it's a standard 3-char currency
  const isStandard = bytes.slice(0, 12).every((b) => b === 0) && bytes.slice(15, 20).every((b) => b === 0);

  if (isStandard) {
    const b12 = bytes[12];
    const b13 = bytes[13];
    const b14 = bytes[14];
    if (b12 !== undefined && b13 !== undefined && b14 !== undefined) {
      return String.fromCharCode(b12, b13, b14);
    }
  }

  // Return full hex for non-standard currencies
  return hex;
}

/**
 * Classify transaction type based on transaction object
 * Returns a TransactionType compatible with the core types
 */
export function classifyTransaction(
  tx: {
    TransactionType?: string;
    Amount?: XrpAmount;
    Destination?: string;
    LimitAmount?: IssuedCurrencyAmount;
  }
): 'native-transfer' | 'token-transfer' | 'approval' | 'unknown' {
  const txType = tx.TransactionType;

  if (txType === XRP_TRANSACTION_TYPES.PAYMENT) {
    if (tx.Amount && isNativeAmount(tx.Amount)) {
      return 'native-transfer';
    }
    return 'token-transfer';
  }

  // TrustSet is similar to an approval - it authorizes a token
  if (txType === XRP_TRANSACTION_TYPES.TRUST_SET) {
    return 'approval';
  }

  return 'unknown';
}
