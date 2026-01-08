import { describe, expect, it, vi } from 'vitest';
import {
  paginationCursorValidation,
  queryStringPaginationObjectSchema,
  queryStringPaginationSchema,
} from '@/src/lib/schemas/pagination-schema.js';

describe('Pagination Schema', () => {
  describe('queryStringPaginationSchema', () => {
    describe('first parameter validation', () => {
      it('accepts valid positive integer strings', () => {
        const result = queryStringPaginationSchema.safeParse({ first: '10' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.first).toBe(10);
        }
      });

      it('accepts first=1', () => {
        const result = queryStringPaginationSchema.safeParse({ first: '1' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.first).toBe(1);
        }
      });

      it('accepts first=1000 (max)', () => {
        const result = queryStringPaginationSchema.safeParse({ first: '1000' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.first).toBe(1000);
        }
      });

      it('rejects non-numeric strings like "string"', () => {
        const result = queryStringPaginationSchema.safeParse({ first: 'string' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]!.message).toBe('Must be a positive integer');
        }
      });

      it('rejects non-numeric strings like "abc"', () => {
        const result = queryStringPaginationSchema.safeParse({ first: 'abc' });
        expect(result.success).toBe(false);
      });

      it('rejects mixed alphanumeric strings like "10abc"', () => {
        const result = queryStringPaginationSchema.safeParse({ first: '10abc' });
        expect(result.success).toBe(false);
      });

      it('rejects floating point strings', () => {
        const result = queryStringPaginationSchema.safeParse({ first: '10.5' });
        expect(result.success).toBe(false);
      });

      it('rejects negative numbers', () => {
        const result = queryStringPaginationSchema.safeParse({ first: '-10' });
        expect(result.success).toBe(false);
      });

      it('rejects zero', () => {
        const result = queryStringPaginationSchema.safeParse({ first: '0' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]!.message).toBe('Must be greater than 0');
        }
      });

      it('rejects values greater than 1000', () => {
        const result = queryStringPaginationSchema.safeParse({ first: '1001' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]!.message).toBe('Must be at most 1000');
        }
      });

      it('rejects empty string', () => {
        const result = queryStringPaginationSchema.safeParse({ first: '' });
        expect(result.success).toBe(false);
      });

      it('rejects whitespace strings', () => {
        const result = queryStringPaginationSchema.safeParse({ first: '  ' });
        expect(result.success).toBe(false);
      });

      it('rejects special characters', () => {
        const result = queryStringPaginationSchema.safeParse({ first: '10!' });
        expect(result.success).toBe(false);
      });
    });

    describe('last parameter validation', () => {
      it('accepts valid positive integer strings', () => {
        const result = queryStringPaginationSchema.safeParse({ last: '20' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.last).toBe(20);
        }
      });

      it('rejects non-numeric strings', () => {
        const result = queryStringPaginationSchema.safeParse({ last: 'string' });
        expect(result.success).toBe(false);
      });

      it('rejects zero', () => {
        const result = queryStringPaginationSchema.safeParse({ last: '0' });
        expect(result.success).toBe(false);
      });

      it('rejects values greater than 1000', () => {
        const result = queryStringPaginationSchema.safeParse({ last: '1001' });
        expect(result.success).toBe(false);
      });
    });

    describe('cursor parameter validation', () => {
      it('accepts valid after cursor with first', () => {
        const result = queryStringPaginationSchema.safeParse({
          first: '10',
          after: 'cursor123',
        });
        expect(result.success).toBe(true);
      });

      it('accepts valid before cursor with last', () => {
        const result = queryStringPaginationSchema.safeParse({
          last: '10',
          before: 'cursor123',
        });
        expect(result.success).toBe(true);
      });

      it('rejects after without first', () => {
        const result = queryStringPaginationSchema.safeParse({
          after: 'cursor123',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const issue = result.error.issues.find((i) => i.path.includes('first'));
          expect(issue?.message).toBe('first is required when using after');
        }
      });

      it('rejects before without last', () => {
        const result = queryStringPaginationSchema.safeParse({
          before: 'cursor123',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const issue = result.error.issues.find((i) => i.path.includes('last'));
          expect(issue?.message).toBe('last is required when using before');
        }
      });

      it('rejects using both first and last', () => {
        const result = queryStringPaginationSchema.safeParse({
          first: '10',
          last: '10',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const issue = result.error.issues.find((i) => i.path.includes('first'));
          expect(issue?.message).toBe('Cannot use both first and last');
        }
      });

      it('rejects using both after and before', () => {
        const result = queryStringPaginationSchema.safeParse({
          first: '10',
          after: 'cursor1',
          before: 'cursor2',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const issue = result.error.issues.find((i) => i.path.includes('after'));
          expect(issue?.message).toBe('Cannot use both after and before');
        }
      });
    });

    describe('nullable and optional handling', () => {
      it('accepts empty object', () => {
        const result = queryStringPaginationSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it('accepts null values', () => {
        const result = queryStringPaginationSchema.safeParse({
          first: null,
          last: null,
          after: null,
          before: null,
        });
        expect(result.success).toBe(true);
      });

      it('accepts undefined values', () => {
        const result = queryStringPaginationSchema.safeParse({
          first: undefined,
          last: undefined,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('queryStringPaginationObjectSchema', () => {
    it('is extendable with additional fields', () => {
      const extendedSchema = queryStringPaginationObjectSchema.extend({
        customField: queryStringPaginationObjectSchema.shape.first,
      });

      const result = extendedSchema.safeParse({
        first: '10',
        customField: '5',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.first).toBe(10);
        expect(result.data.customField).toBe(5);
      }
    });

    it('extended schema can apply superRefine', () => {
      const extendedSchema = queryStringPaginationObjectSchema
        .extend({
          monitored: queryStringPaginationObjectSchema.shape.after,
        })
        .superRefine(paginationCursorValidation);

      // Test that cursor validation still works
      const result = extendedSchema.safeParse({
        after: 'cursor123',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('paginationCursorValidation', () => {
    it('validates first and last conflict', () => {
      const mockCtx = {
        addIssue: vi.fn(),
      };

      paginationCursorValidation(
        { first: 10, last: 10, after: null, before: null },
        mockCtx as any
      );

      expect(mockCtx.addIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cannot use both first and last',
          path: ['first'],
        })
      );
    });

    it('validates after and before conflict', () => {
      const mockCtx = {
        addIssue: vi.fn(),
      };

      paginationCursorValidation(
        { first: 10, last: null, after: 'a', before: 'b' },
        mockCtx as any
      );

      expect(mockCtx.addIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cannot use both after and before',
          path: ['after'],
        })
      );
    });

    it('validates after requires first', () => {
      const mockCtx = {
        addIssue: vi.fn(),
      };

      paginationCursorValidation(
        { first: null, last: null, after: 'cursor', before: null },
        mockCtx as any
      );

      expect(mockCtx.addIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'first is required when using after',
          path: ['first'],
        })
      );
    });

    it('validates before requires last', () => {
      const mockCtx = {
        addIssue: vi.fn(),
      };

      paginationCursorValidation(
        { first: null, last: null, after: null, before: 'cursor' },
        mockCtx as any
      );

      expect(mockCtx.addIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'last is required when using before',
          path: ['last'],
        })
      );
    });

    it('does not add issues for valid combinations', () => {
      const mockCtx = {
        addIssue: vi.fn(),
      };

      paginationCursorValidation(
        { first: 10, last: null, after: 'cursor', before: null },
        mockCtx as any
      );

      expect(mockCtx.addIssue).not.toHaveBeenCalled();
    });
  });
});
