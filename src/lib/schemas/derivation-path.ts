import { z } from 'zod';

const MAX_INDEX = 0x7fffffff; // 2^31 - 1

export const isValidStructuredDerivationPath = (val: string): boolean => {
  if (!val.startsWith('m/')) return false;

  const parts = val.slice(2).split('/');
  if (parts.length < 4) return false;

  const [purpose, coinType, account, ...indexes] = parts;

  if (purpose !== '44' || coinType !== '0' || account !== '0') return false;

  return indexes.every((index) => {
    if (!/^\d+$/.test(index)) return false;

    try {
      const n = BigInt(index);
      return n >= 0n && n <= BigInt(MAX_INDEX);
    } catch {
      return false;
    }
  });
};

export const structuredDerivationPathSchema = z
  .string()
  .refine(isValidStructuredDerivationPath, {
    message: 'Derivation path must be in format "m/44/0/0/{index}" with no hardened paths.',
  });

export const simpleDerivationPathSchema = z
  .string()
  .regex(/^m(\/\d+)+$/, {
    message:
      'Derivation path must be in format "m/0/1/..." using only non-hardened numeric indexes.',
  })
  .refine(
    (val: string) => {
      try {
        const parts = val.split('/').slice(1); // remove "m"
        return parts.every((p: string) => {
          const n = BigInt(p);
          return n >= 0n && n <= BigInt(MAX_INDEX);
        });
      } catch {
        return false;
      }
    },
    {
      message: `Each index in derivation path must be between 0 and ${MAX_INDEX}`,
    }
  );

export type StructuredDerivationPathSchema = z.infer<typeof structuredDerivationPathSchema>;
export type SimpleDerivationPathSchema = z.infer<typeof simpleDerivationPathSchema>;
