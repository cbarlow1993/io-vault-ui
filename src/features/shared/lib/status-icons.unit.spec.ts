import { describe, it, expect } from 'vitest';

import { getStatusIconType, type StatusIconType } from './status-icons';

describe('status icons', () => {
  describe('getStatusIconType', () => {
    it.each([
      // Positive statuses
      ['completed', 'positive'],
      ['success', 'positive'],
      ['approved', 'positive'],
      ['active', 'positive'],
      ['verified', 'positive'],
      ['paid', 'positive'],
    ] as const)('should return "positive" for %s', (status, expected) => {
      expect(getStatusIconType(status)).toBe(expected);
    });

    it.each([
      // Warning statuses
      ['pending', 'warning'],
      ['voting', 'warning'],
      ['presigning', 'warning'],
      ['signing', 'warning'],
    ] as const)('should return "warning" for %s', (status, expected) => {
      expect(getStatusIconType(status)).toBe(expected);
    });

    it.each([
      // Negative statuses
      ['failed', 'negative'],
      ['rejected', 'negative'],
      ['expired', 'negative'],
      ['failure', 'negative'],
      ['revoked', 'negative'],
    ] as const)('should return "negative" for %s', (status, expected) => {
      expect(getStatusIconType(status)).toBe(expected);
    });

    it('should return "warning" for unknown status', () => {
      expect(getStatusIconType('unknown-status')).toBe('warning');
    });
  });
});
