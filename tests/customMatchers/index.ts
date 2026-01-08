// Custom matchers
import '@/tests/customMatchers/toMatchNumber.js';

import 'vitest';

//TS declaration of custom matchers
interface CustomMatchers<R = unknown> {
  toMatchNumber: (expected: string | number | BigNumber) => R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
