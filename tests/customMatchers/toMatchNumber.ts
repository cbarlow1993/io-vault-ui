import { BigNumber } from 'bignumber.js';
import { expect } from 'vitest';

function toBigNumberSafe(value: string | number | BigNumber): BigNumber | undefined {
  try {
    return BigNumber.isBigNumber(value) ? value : new BigNumber(value);
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

expect.extend({
  toMatchNumber(received, expected) {
    const receivedDecimal: BigNumber = toBigNumberSafe(received) ?? received;
    const expectedDecimal: BigNumber = toBigNumberSafe(expected) ?? expected;

    const pass =
      BigNumber.isBigNumber(receivedDecimal) &&
      BigNumber.isBigNumber(expectedDecimal) &&
      receivedDecimal.eq(expectedDecimal);

    return {
      message: () => `Received ${received} is ${pass ? '' : ' not '} equivalent to ${expected}`,
      pass,
      actual: receivedDecimal?.toString(),
      expected: expectedDecimal?.toString(),
    };
  },
});
