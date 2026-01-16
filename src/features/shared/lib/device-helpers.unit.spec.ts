import { describe, expect, it } from 'vitest';

import { getDeviceLabel } from './device-helpers';

describe('device helpers', () => {
  describe('getDeviceLabel', () => {
    it.each([
      ['ios', 'iOS'],
      ['android', 'Android'],
      ['virtual', 'Virtual'],
    ] as const)('should return correct label for %s', (type, expected) => {
      expect(getDeviceLabel(type)).toBe(expected);
    });
  });
});
