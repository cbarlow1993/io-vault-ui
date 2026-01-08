import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor } from '@/src/services/transactions/cursor.js';

describe('Cursor utilities', () => {
  describe('encodeCursor', () => {
    it('encodes timestamp and txId to base64url string', () => {
      const timestamp = new Date('2024-01-15T10:30:00.000Z');
      const txId = '123e4567-e89b-12d3-a456-426614174000';

      const cursor = encodeCursor(timestamp, txId);

      expect(typeof cursor).toBe('string');
      expect(cursor).not.toContain('+');
      expect(cursor).not.toContain('/');
      expect(cursor).not.toContain('=');
    });
  });

  describe('decodeCursor', () => {
    it('decodes cursor back to timestamp and txId', () => {
      const originalTimestamp = new Date('2024-01-15T10:30:00.000Z');
      const originalTxId = '123e4567-e89b-12d3-a456-426614174000';

      const cursor = encodeCursor(originalTimestamp, originalTxId);
      const decoded = decodeCursor(cursor);

      expect(decoded.timestamp.getTime()).toBe(originalTimestamp.getTime());
      expect(decoded.txId).toBe(originalTxId);
    });

    it('throws on invalid cursor', () => {
      expect(() => decodeCursor('invalid-cursor')).toThrow();
    });
  });

  describe('roundtrip', () => {
    it('preserves data through encode/decode cycle', () => {
      const timestamps = [
        new Date('2020-01-01T00:00:00.000Z'),
        new Date('2024-12-31T23:59:59.999Z'),
        new Date(),
      ];
      const txId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

      for (const ts of timestamps) {
        const cursor = encodeCursor(ts, txId);
        const decoded = decodeCursor(cursor);
        expect(decoded.timestamp.getTime()).toBe(ts.getTime());
        expect(decoded.txId).toBe(txId);
      }
    });
  });
});
