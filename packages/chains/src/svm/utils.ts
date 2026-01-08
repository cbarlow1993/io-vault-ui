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
  const [integerPart, fractionalPart = ''] = value.split('.');
  const paddedFraction = fractionalPart.slice(0, decimals).padEnd(decimals, '0');
  return BigInt(integerPart + paddedFraction);
}

// Solana-specific constants
export const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const SPL_TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
