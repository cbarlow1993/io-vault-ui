import { describe, expect, it } from 'vitest';
import { validatePsbt } from '@/src/services/psbt/validatePsbt.js';

describe('validatePsbt', () => {
  const hexPsbt =
    '70736274ff010071020000000166d3834dd08940b254a74d2c0d7b279161e579d1015aad3c54664b70b81ae4880100000000fdffffff0284030000000000001600143436574e3ab8009da672c6cb8f53f928158e8cf72404000000000000160014ba8993cc8dcdc6f779caa365190c09ff8d9526d0000000000001011f300b000000000000160014ba8993cc8dcdc6f779caa365190c09ff8d9526d0000000';

  it('should validate a psbt', () => {
    const amountInSatoshis = 900; // 0.000009 BTC
    validatePsbt({
      psbtHex: hexPsbt,
      expected: {
        to: 'bc1qxsm9wn36hqqfmfnjcm9c75le9q2car8hylaels',
        amount: BigInt(amountInSatoshis),
        from: 'bc1qh2ye8nydehr0w7w25dj3jrqfl7xe2fks5swpae',
      },
    });
  });

  it('should throw an error if the psbt amount does not match the expected values', () => {
    const amountInSatoshis = 800; // 0.000008 BTC
    expect(() =>
      validatePsbt({
        psbtHex: hexPsbt,
        expected: {
          to: 'bc1qxsm9wn36hqqfmfnjcm9c75le9q2car8hylaels',
          amount: BigInt(amountInSatoshis),
          from: 'bc1qh2ye8nydehr0w7w25dj3jrqfl7xe2fks5swpae',
        },
      })
    ).toThrow();
  });

  it('should throw an error if the psbt to address does not match the expected values', () => {
    const amountInSatoshis = 900; // 0.000009 BTC
    expect(() =>
      validatePsbt({
        psbtHex: hexPsbt,
        expected: {
          to: 'bc1qh2ye8nydehr0w7w25dj3jrqfl7xe2fks5swpae',
          amount: BigInt(amountInSatoshis),
          from: 'bc1qh2ye8nydehr0w7w25dj3jrqfl7xe2fks5swpae',
        },
      })
    ).toThrow();
  });

  it('should throw an error if the psbt from address does not match the expected values', () => {
    const amountInSatoshis = 900; // 0.000009 BTC
    expect(() =>
      validatePsbt({
        psbtHex: hexPsbt,
        expected: {
          to: 'bc1qxsm9wn36hqqfmfnjcm9c75le9q2car8hylaels',
          amount: BigInt(amountInSatoshis),
          from: 'bc1qxsm9wn36hqqfmfnjcm9c75le9q2car8hylaels',
        },
      })
    ).toThrow();
  });
});
