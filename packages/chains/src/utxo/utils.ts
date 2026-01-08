// packages/chains/src/utxo/utils.ts

// ============ Unit Conversion ============

/**
 * Convert satoshis to BTC string representation
 * @param satoshis - Amount in satoshis
 * @param decimals - Number of decimal places (default 8)
 */
export function formatSatoshis(satoshis: bigint, decimals: number = 8): string {
  const divisor = BigInt(10 ** decimals);
  const whole = satoshis / divisor;
  const fraction = satoshis % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmed = fractionStr.replace(/0+$/, '');
  return `${whole}.${trimmed}`;
}

/**
 * Convert BTC string to satoshis
 * @param btc - Amount in BTC (e.g., "0.001")
 * @param decimals - Number of decimal places (default 8)
 */
export function parseSatoshis(btc: string, decimals: number = 8): bigint {
  const [whole, fraction = ''] = btc.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFraction);
}

// ============ Address Validation ============

/**
 * Validates a Bitcoin address format (basic validation)
 */
export function isValidBitcoinAddress(address: string): boolean {
  // Legacy P2PKH (starts with 1)
  if (/^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
    return true;
  }
  // Legacy P2SH (starts with 3)
  if (/^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
    return true;
  }
  // Native SegWit P2WPKH/P2WSH (starts with bc1)
  if (/^bc1[a-z0-9]{39,59}$/.test(address)) {
    return true;
  }
  // Testnet addresses
  if (/^[mn2][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
    return true;
  }
  // Testnet SegWit (starts with tb1)
  if (/^tb1[a-z0-9]{39,59}$/.test(address)) {
    return true;
  }
  return false;
}

// ============ UTXO Types ============

export interface UTXO {
  txid: string;
  vout: number;
  value: bigint;
  scriptPubKey: string;
  address?: string;
  confirmations?: number;
}

export interface TransactionInput {
  txid: string;
  vout: number;
  scriptSig?: string;
  witness?: string[];
  sequence: number;
}

export interface TransactionOutput {
  value: bigint;
  scriptPubKey: string;
  address?: string;
}

// ============ Script Types ============

export const SCRIPT_TYPES = {
  P2PKH: 'p2pkh', // Pay to Public Key Hash (Legacy, starts with 1)
  P2SH: 'p2sh', // Pay to Script Hash (starts with 3)
  P2WPKH: 'p2wpkh', // Pay to Witness Public Key Hash (Native SegWit, bc1q)
  P2WSH: 'p2wsh', // Pay to Witness Script Hash (bc1q, longer)
  P2TR: 'p2tr', // Pay to Taproot (bc1p)
} as const;

export type ScriptType = (typeof SCRIPT_TYPES)[keyof typeof SCRIPT_TYPES];

/**
 * Determine script type from address prefix
 */
export function getScriptTypeFromAddress(address: string): ScriptType | null {
  if (address.startsWith('1') || address.startsWith('m') || address.startsWith('n')) {
    return SCRIPT_TYPES.P2PKH;
  }
  if (address.startsWith('3') || address.startsWith('2')) {
    return SCRIPT_TYPES.P2SH;
  }
  if (address.startsWith('bc1q') || address.startsWith('tb1q')) {
    // Could be P2WPKH or P2WSH based on length
    return address.length === 42 || address.length === 43 ? SCRIPT_TYPES.P2WPKH : SCRIPT_TYPES.P2WSH;
  }
  if (address.startsWith('bc1p') || address.startsWith('tb1p')) {
    return SCRIPT_TYPES.P2TR;
  }
  return null;
}

// ============ Fee Estimation ============

/**
 * Estimate transaction size in virtual bytes
 */
export function estimateTransactionSize(
  inputCount: number,
  outputCount: number,
  scriptType: ScriptType = SCRIPT_TYPES.P2WPKH
): number {
  // Base transaction overhead
  const baseSize = 10; // version (4) + locktime (4) + marker/flag (2 for segwit)

  // Input sizes vary by script type
  let inputSize: number;
  switch (scriptType) {
    case SCRIPT_TYPES.P2PKH:
      inputSize = 148; // Legacy input
      break;
    case SCRIPT_TYPES.P2SH:
      inputSize = 91; // P2SH-P2WPKH (nested segwit)
      break;
    case SCRIPT_TYPES.P2WPKH:
      inputSize = 68; // Native SegWit
      break;
    case SCRIPT_TYPES.P2WSH:
      inputSize = 104; // Multi-sig witness
      break;
    case SCRIPT_TYPES.P2TR:
      inputSize = 57.5; // Taproot (key path spend)
      break;
    default:
      inputSize = 68;
  }

  // Output sizes
  const outputSize = 34; // Standard P2WPKH output

  // Calculate virtual size
  return Math.ceil(baseSize + inputCount * inputSize + outputCount * outputSize);
}

/**
 * Calculate fee for transaction
 */
export function calculateFee(vbytes: number, satoshisPerVbyte: number): bigint {
  return BigInt(Math.ceil(vbytes * satoshisPerVbyte));
}
