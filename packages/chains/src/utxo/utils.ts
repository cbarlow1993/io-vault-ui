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
