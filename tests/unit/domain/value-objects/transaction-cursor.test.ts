import { describe, expect, it } from 'vitest';
import {
  TransactionCursor,
  InvalidCursorError,
} from '@/src/domain/value-objects/index.js';

describe('TransactionCursor', () => {
  const testTimestamp = new Date('2024-01-15T10:30:00.000Z');
  const testTransactionId = '550e8400-e29b-41d4-a716-446655440000';

  describe('create', () => {
    it('creates a cursor from timestamp and transaction ID', () => {
      const cursor = TransactionCursor.create(testTimestamp, testTransactionId);

      expect(cursor.timestamp).toEqual(testTimestamp);
      expect(cursor.transactionId).toBe(testTransactionId);
    });

    it('throws InvalidCursorError for invalid timestamp', () => {
      expect(() =>
        TransactionCursor.create(new Date('invalid'), testTransactionId)
      ).toThrow(InvalidCursorError);
    });

    it('throws InvalidCursorError for empty transaction ID', () => {
      expect(() => TransactionCursor.create(testTimestamp, '')).toThrow(
        InvalidCursorError
      );
      expect(() => TransactionCursor.create(testTimestamp, '   ')).toThrow(
        InvalidCursorError
      );
    });
  });

  describe('encode/decode', () => {
    it('encodes cursor to base64url string', () => {
      const cursor = TransactionCursor.create(testTimestamp, testTransactionId);
      const encoded = cursor.encode();

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
      // Base64url should not contain +, /, or =
      expect(encoded).not.toMatch(/[+/=]/);
    });

    it('decodes base64url string to cursor', () => {
      const original = TransactionCursor.create(testTimestamp, testTransactionId);
      const encoded = original.encode();
      const decoded = TransactionCursor.decode(encoded);

      expect(decoded.timestamp.getTime()).toBe(original.timestamp.getTime());
      expect(decoded.transactionId).toBe(original.transactionId);
    });

    it('roundtrips correctly', () => {
      const timestamps = [
        new Date('2020-01-01T00:00:00.000Z'),
        new Date('2024-06-15T12:30:45.123Z'),
        new Date(),
      ];
      const ids = [
        '123e4567-e89b-12d3-a456-426614174000',
        'abc-def-123',
        'simple-id',
      ];

      for (const ts of timestamps) {
        for (const id of ids) {
          const original = TransactionCursor.create(ts, id);
          const roundtripped = TransactionCursor.decode(original.encode());
          expect(roundtripped.timestamp.getTime()).toBe(ts.getTime());
          expect(roundtripped.transactionId).toBe(id);
        }
      }
    });

    it('throws InvalidCursorError for invalid base64', () => {
      expect(() => TransactionCursor.decode('not-valid-base64!!!')).toThrow(
        InvalidCursorError
      );
    });

    it('throws InvalidCursorError for invalid JSON', () => {
      // Valid base64url but not valid JSON
      const invalidJson = Buffer.from('not json at all').toString('base64url');
      expect(() => TransactionCursor.decode(invalidJson)).toThrow(
        InvalidCursorError
      );
    });

    it('throws InvalidCursorError for missing fields', () => {
      // Valid base64url and valid JSON, but missing required fields
      const missingId = Buffer.from(JSON.stringify({ ts: 1234567890 })).toString(
        'base64url'
      );
      expect(() => TransactionCursor.decode(missingId)).toThrow(
        InvalidCursorError
      );

      const missingTs = Buffer.from(
        JSON.stringify({ id: 'some-id' })
      ).toString('base64url');
      expect(() => TransactionCursor.decode(missingTs)).toThrow(
        InvalidCursorError
      );
    });

    it('throws InvalidCursorError for wrong field types', () => {
      // ts should be number, id should be string
      const wrongTsType = Buffer.from(
        JSON.stringify({ ts: 'not-a-number', id: 'valid-id' })
      ).toString('base64url');
      expect(() => TransactionCursor.decode(wrongTsType)).toThrow(
        InvalidCursorError
      );

      const wrongIdType = Buffer.from(
        JSON.stringify({ ts: 1234567890, id: 12345 })
      ).toString('base64url');
      expect(() => TransactionCursor.decode(wrongIdType)).toThrow(
        InvalidCursorError
      );
    });

    it('throws InvalidCursorError for empty cursor string', () => {
      expect(() => TransactionCursor.decode('')).toThrow(InvalidCursorError);
    });
  });

  describe('compare', () => {
    it('returns -1 when this cursor is before other (earlier timestamp)', () => {
      const earlier = TransactionCursor.create(
        new Date('2024-01-01T10:00:00.000Z'),
        'id-1'
      );
      const later = TransactionCursor.create(
        new Date('2024-01-01T11:00:00.000Z'),
        'id-2'
      );

      expect(earlier.compare(later)).toBe(-1);
    });

    it('returns 1 when this cursor is after other (later timestamp)', () => {
      const earlier = TransactionCursor.create(
        new Date('2024-01-01T10:00:00.000Z'),
        'id-1'
      );
      const later = TransactionCursor.create(
        new Date('2024-01-01T11:00:00.000Z'),
        'id-2'
      );

      expect(later.compare(earlier)).toBe(1);
    });

    it('returns 0 when timestamps are equal (tie-breaker by ID)', () => {
      const sameTime = new Date('2024-01-01T10:00:00.000Z');
      const cursor1 = TransactionCursor.create(sameTime, 'aaa');
      const cursor2 = TransactionCursor.create(sameTime, 'zzz');
      const cursor3 = TransactionCursor.create(sameTime, 'aaa');

      // When timestamps are equal, compare by ID
      expect(cursor1.compare(cursor2)).toBe(-1); // 'aaa' < 'zzz'
      expect(cursor2.compare(cursor1)).toBe(1); // 'zzz' > 'aaa'
      expect(cursor1.compare(cursor3)).toBe(0); // same timestamp and ID
    });
  });

  describe('equals', () => {
    it('returns true for cursors with same timestamp and ID', () => {
      const cursor1 = TransactionCursor.create(testTimestamp, testTransactionId);
      const cursor2 = TransactionCursor.create(testTimestamp, testTransactionId);

      expect(cursor1.equals(cursor2)).toBe(true);
    });

    it('returns false for different timestamps', () => {
      const cursor1 = TransactionCursor.create(testTimestamp, testTransactionId);
      const cursor2 = TransactionCursor.create(
        new Date('2024-01-16T10:30:00.000Z'),
        testTransactionId
      );

      expect(cursor1.equals(cursor2)).toBe(false);
    });

    it('returns false for different IDs', () => {
      const cursor1 = TransactionCursor.create(testTimestamp, 'id-1');
      const cursor2 = TransactionCursor.create(testTimestamp, 'id-2');

      expect(cursor1.equals(cursor2)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const cursor = TransactionCursor.create(testTimestamp, testTransactionId);
      expect(Object.isFrozen(cursor)).toBe(true);
    });

    it('timestamp is a new Date instance (defensive copy)', () => {
      const originalDate = new Date('2024-01-15T10:30:00.000Z');
      const cursor = TransactionCursor.create(originalDate, testTransactionId);

      // Modify original date
      originalDate.setFullYear(2000);

      // Cursor should not be affected
      expect(cursor.timestamp.getFullYear()).toBe(2024);
    });
  });
});
