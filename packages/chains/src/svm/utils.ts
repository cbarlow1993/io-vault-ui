// packages/chains/src/svm/utils.ts

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

// Solana-specific constants
export const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const SPL_TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
export const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';

// Base58 alphabet (Bitcoin/Solana variant - no 0, O, I, l)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_MAP = new Map<string, number>();
for (let i = 0; i < BASE58_ALPHABET.length; i++) {
  BASE58_MAP.set(BASE58_ALPHABET[i]!, i);
}

/**
 * Encode bytes to base58 string
 */
export function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';

  // Count leading zeros
  let zeros = 0;
  for (const byte of bytes) {
    if (byte === 0) zeros++;
    else break;
  }

  // Convert to base58
  const size = Math.ceil(bytes.length * 138 / 100) + 1; // log(256) / log(58), rounded up
  const b58 = new Uint8Array(size);

  for (const byte of bytes) {
    let carry = byte;
    for (let j = size - 1; j >= 0; j--) {
      carry += 256 * b58[j]!;
      b58[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
  }

  // Skip leading zeros in base58 result
  let i = 0;
  while (i < size && b58[i] === 0) i++;

  // Build result string
  let result = '1'.repeat(zeros);
  for (; i < size; i++) {
    result += BASE58_ALPHABET[b58[i]!];
  }

  return result;
}

/**
 * Decode base58 string to bytes
 */
export function base58Decode(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0);

  // Count leading '1's (zeros in byte form)
  let zeros = 0;
  for (const char of str) {
    if (char === '1') zeros++;
    else break;
  }

  // Allocate enough space (log(58) / log(256), rounded up)
  const size = Math.ceil(str.length * 733 / 1000) + 1;
  const bytes = new Uint8Array(size);

  for (const char of str) {
    const value = BASE58_MAP.get(char);
    if (value === undefined) {
      throw new Error(`Invalid base58 character: ${char}`);
    }

    let carry = value;
    for (let j = size - 1; j >= 0; j--) {
      carry += 58 * bytes[j]!;
      bytes[j] = carry % 256;
      carry = Math.floor(carry / 256);
    }
  }

  // Skip leading zeros in byte result
  let i = 0;
  while (i < size && bytes[i] === 0) i++;

  // Build result with leading zeros
  const result = new Uint8Array(zeros + (size - i));
  for (let j = zeros; j < result.length; j++) {
    result[j] = bytes[i++]!;
  }

  return result;
}

/**
 * Validate a Solana address (base58-encoded 32-byte public key)
 */
export function validateSolanaAddress(address: string): boolean {
  try {
    // Check length (32-44 chars is typical for base58-encoded 32 bytes)
    if (address.length < 32 || address.length > 44) {
      return false;
    }

    // Check for valid base58 characters
    for (const char of address) {
      if (!BASE58_MAP.has(char)) {
        return false;
      }
    }

    // Decode and verify it's exactly 32 bytes
    const decoded = base58Decode(address);
    return decoded.length === 32;
  } catch {
    return false;
  }
}

/**
 * Encode a number as compact-u16 (Solana's variable-length unsigned integer)
 * Used for array lengths in Solana transaction serialization
 */
export function encodeCompactU16(value: number): Uint8Array {
  if (value < 0 || value > 0xffff) {
    throw new Error(`Value out of range for compact-u16: ${value}`);
  }

  if (value < 0x80) {
    return new Uint8Array([value]);
  } else if (value < 0x4000) {
    return new Uint8Array([
      (value & 0x7f) | 0x80,
      (value >> 7) & 0x7f,
    ]);
  } else {
    return new Uint8Array([
      (value & 0x7f) | 0x80,
      ((value >> 7) & 0x7f) | 0x80,
      (value >> 14) & 0x03,
    ]);
  }
}

/**
 * Solana transaction instruction for serialization
 */
export interface SerializableInstruction {
  programId: string;
  accounts: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  data: string; // base64 encoded
}

/**
 * Serialize a Solana transaction message for signing
 * Returns the serialized message bytes ready for ed25519 signing
 */
export function serializeSolanaMessage(
  feePayer: string,
  recentBlockhash: string,
  instructions: SerializableInstruction[]
): Uint8Array {
  // Build unique account list with proper ordering:
  // 1. Fee payer (signer, writable)
  // 2. Other signers (writable first, then readonly)
  // 3. Non-signers (writable first, then readonly)
  const accountMetas = new Map<string, { isSigner: boolean; isWritable: boolean }>();

  // Fee payer is always first, always signer, always writable
  accountMetas.set(feePayer, { isSigner: true, isWritable: true });

  // Collect all accounts from instructions
  for (const ix of instructions) {
    // Add program ID as non-signer, non-writable
    if (!accountMetas.has(ix.programId)) {
      accountMetas.set(ix.programId, { isSigner: false, isWritable: false });
    }

    for (const acc of ix.accounts) {
      const existing = accountMetas.get(acc.pubkey);
      if (existing) {
        // Upgrade permissions if needed
        accountMetas.set(acc.pubkey, {
          isSigner: existing.isSigner || acc.isSigner,
          isWritable: existing.isWritable || acc.isWritable,
        });
      } else {
        accountMetas.set(acc.pubkey, {
          isSigner: acc.isSigner,
          isWritable: acc.isWritable,
        });
      }
    }
  }

  // Sort accounts: signers first (writable, then readonly), then non-signers (writable, then readonly)
  const accounts = Array.from(accountMetas.entries());

  const signersWritable: string[] = [];
  const signersReadonly: string[] = [];
  const nonSignersWritable: string[] = [];
  const nonSignersReadonly: string[] = [];

  for (const [pubkey, meta] of accounts) {
    if (meta.isSigner) {
      if (meta.isWritable) {
        signersWritable.push(pubkey);
      } else {
        signersReadonly.push(pubkey);
      }
    } else {
      if (meta.isWritable) {
        nonSignersWritable.push(pubkey);
      } else {
        nonSignersReadonly.push(pubkey);
      }
    }
  }

  // Ensure fee payer is first
  const feePayerIdx = signersWritable.indexOf(feePayer);
  if (feePayerIdx > 0) {
    signersWritable.splice(feePayerIdx, 1);
    signersWritable.unshift(feePayer);
  }

  const orderedAccounts = [
    ...signersWritable,
    ...signersReadonly,
    ...nonSignersWritable,
    ...nonSignersReadonly,
  ];

  // Build account index lookup
  const accountIndexMap = new Map<string, number>();
  for (let i = 0; i < orderedAccounts.length; i++) {
    accountIndexMap.set(orderedAccounts[i]!, i);
  }

  // Calculate header values
  const numRequiredSignatures = signersWritable.length + signersReadonly.length;
  const numReadonlySignedAccounts = signersReadonly.length;
  const numReadonlyUnsignedAccounts = nonSignersReadonly.length;

  // Serialize message
  const parts: Uint8Array[] = [];

  // Header (3 bytes)
  parts.push(new Uint8Array([numRequiredSignatures, numReadonlySignedAccounts, numReadonlyUnsignedAccounts]));

  // Account keys (compact-u16 length + 32-byte keys)
  parts.push(encodeCompactU16(orderedAccounts.length));
  for (const pubkey of orderedAccounts) {
    parts.push(base58Decode(pubkey));
  }

  // Recent blockhash (32 bytes)
  parts.push(base58Decode(recentBlockhash));

  // Instructions (compact-u16 length + instructions)
  parts.push(encodeCompactU16(instructions.length));
  for (const ix of instructions) {
    // Program ID index (1 byte)
    const programIdIdx = accountIndexMap.get(ix.programId);
    if (programIdIdx === undefined) {
      throw new Error(`Program ID not found in account list: ${ix.programId}`);
    }
    parts.push(new Uint8Array([programIdIdx]));

    // Account indices (compact-u16 length + indices)
    parts.push(encodeCompactU16(ix.accounts.length));
    const accountIndices = new Uint8Array(ix.accounts.length);
    for (let i = 0; i < ix.accounts.length; i++) {
      const idx = accountIndexMap.get(ix.accounts[i]!.pubkey);
      if (idx === undefined) {
        throw new Error(`Account not found in account list: ${ix.accounts[i]!.pubkey}`);
      }
      accountIndices[i] = idx;
    }
    parts.push(accountIndices);

    // Data (compact-u16 length + bytes)
    const data = Buffer.from(ix.data, 'base64');
    parts.push(encodeCompactU16(data.length));
    parts.push(new Uint8Array(data));
  }

  // Concatenate all parts
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

/**
 * Serialize a complete Solana transaction (signatures + message)
 */
export function serializeSolanaTransaction(
  signatures: Uint8Array[],
  message: Uint8Array
): Uint8Array {
  const parts: Uint8Array[] = [];

  // Signature count (compact-u16)
  parts.push(encodeCompactU16(signatures.length));

  // Signatures (64 bytes each)
  for (const sig of signatures) {
    if (sig.length !== 64) {
      throw new Error(`Invalid signature length: ${sig.length}, expected 64`);
    }
    parts.push(sig);
  }

  // Message
  parts.push(message);

  // Concatenate all parts
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}
