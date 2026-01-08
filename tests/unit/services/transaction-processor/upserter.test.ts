import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';

const mockTransaction = vi.fn();

const mockDb = {
  transaction: () => ({
    execute: mockTransaction,
  }),
} as unknown as Kysely<Database>;

import { TransactionUpserter } from '@/src/services/transaction-processor/upserter.js';
import type {
  NormalizedTransaction,
  ClassificationResult,
  TokenInfo,
} from '@/src/services/transaction-processor/types.js';

/**
 * Creates a mock for the Kysely insert builder chain with proper method chaining.
 * Optionally captures values passed to the builder for assertions.
 */
function createMockInsertBuilder(returnValue?: unknown, captureValues?: { values: unknown[]; updateSets: unknown[] }) {
  const mockBuilder: Record<string, unknown> = {};

  // Build the chain from the end backwards
  mockBuilder.execute = vi.fn().mockResolvedValue(returnValue);
  mockBuilder.executeTakeFirstOrThrow = vi.fn().mockResolvedValue(returnValue);
  mockBuilder.returningAll = vi.fn().mockReturnValue(mockBuilder);
  mockBuilder.doUpdateSet = vi.fn().mockImplementation((updateSet: unknown) => {
    if (captureValues) {
      captureValues.updateSets.push(updateSet);
    }
    return mockBuilder;
  });
  mockBuilder.columns = vi.fn().mockReturnValue(mockBuilder);
  mockBuilder.onConflict = vi.fn().mockImplementation((cb: (oc: unknown) => unknown) => {
    // Call the callback with a mock that returns doUpdateSet
    cb({
      columns: vi.fn().mockReturnValue({
        doUpdateSet: vi.fn().mockImplementation((updateSet: unknown) => {
          if (captureValues) {
            captureValues.updateSets.push(updateSet);
          }
          return mockBuilder;
        }),
      }),
    });
    return mockBuilder;
  });
  mockBuilder.values = vi.fn().mockImplementation((vals: unknown) => {
    if (captureValues) {
      captureValues.values.push(vals);
    }
    return mockBuilder;
  });
  mockBuilder.insertInto = vi.fn().mockReturnValue(mockBuilder);

  return mockBuilder;
}

/**
 * Creates a mock for the Kysely delete builder chain with proper method chaining.
 */
function createMockDeleteBuilder() {
  const mockBuilder: Record<string, unknown> = {};

  mockBuilder.execute = vi.fn().mockResolvedValue(undefined);
  mockBuilder.where = vi.fn().mockReturnValue(mockBuilder);

  return mockBuilder;
}

describe('TransactionUpserter', () => {
  let upserter: TransactionUpserter;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTransaction.mockImplementation(async (fn) => {
      const mockInsertTrx = createMockInsertBuilder({
        id: 'tx-123',
        chain_alias: 'eth' as ChainAlias,
      });
      const mockDeleteTrx = createMockDeleteBuilder();

      return fn({
        insertInto: vi.fn().mockReturnValue(mockInsertTrx),
        deleteFrom: vi.fn().mockReturnValue(mockDeleteTrx),
      });
    });

    upserter = new TransactionUpserter(mockDb);
  });

  const normalizedTx: NormalizedTransaction = {
    chainAlias: 'eth' as ChainAlias,
    txHash: '0xabc123',
    blockNumber: '12345678',
    blockHash: '0xblockhash',
    timestamp: new Date('2024-01-01'),
    from: '0xsender',
    to: '0xrecipient',
    value: '1000000000000000000',
    fee: '21000000000000',
    status: 'success',
  };

  const classification: ClassificationResult = {
    type: 'transfer',
    direction: 'out',
    confidence: 'high',
    source: 'custom',
    label: 'Token Transfer',
    transfers: [
      {
        type: 'token',
        direction: 'out',
        from: '0xsender',
        to: '0xrecipient',
        amount: '1000000',
        token: { address: '0xtoken', symbol: 'TEST', decimals: 18 },
      },
    ],
  };

  const tokens: TokenInfo[] = [
    { address: '0xtoken', symbol: 'TEST', name: 'Test Token', decimals: 18 },
  ];

  it('upserts transaction with classification', async () => {
    const result = await upserter.upsert(normalizedTx, classification, tokens);

    expect(result.transactionId).toBe('tx-123');
    expect(result.classificationType).toBe('transfer');
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('reports tokens upserted count', async () => {
    const result = await upserter.upsert(normalizedTx, classification, tokens);

    expect(result.tokensDiscovered).toBe(1);
    expect(result.tokensUpserted).toBe(1);
  });

  it('handles transactions with no tokens', async () => {
    const nativeClassification: ClassificationResult = {
      type: 'transfer',
      direction: 'out',
      confidence: 'high',
      source: 'custom',
      label: 'Native Transfer',
      transfers: [
        {
          type: 'native',
          direction: 'out',
          from: '0xsender',
          to: '0xrecipient',
          amount: '1000000000000000000',
        },
      ],
    };

    const result = await upserter.upsert(normalizedTx, nativeClassification, []);

    expect(result.tokensDiscovered).toBe(0);
    expect(result.tokensUpserted).toBe(0);
  });

  describe('token classification fields', () => {
    it('sets needs_classification=true for new tokens on insert', async () => {
      const capturedValues: { values: unknown[]; updateSets: unknown[] } = { values: [], updateSets: [] };
      let insertIntoCallCount = 0;

      mockTransaction.mockImplementation(async (fn) => {
        const mockInsertTrx = createMockInsertBuilder(
          { id: 'tx-123', chain_alias: 'eth' as ChainAlias },
          capturedValues
        );
        const mockDeleteTrx = createMockDeleteBuilder();

        // Track which table is being inserted into
        const mockInsertInto = vi.fn().mockImplementation((table: string) => {
          insertIntoCallCount++;
          // Store the table name for the captured values
          if (capturedValues.values.length < insertIntoCallCount) {
            // Will be filled when values() is called
          }
          return mockInsertTrx;
        });

        return fn({
          insertInto: mockInsertInto,
          deleteFrom: vi.fn().mockReturnValue(mockDeleteTrx),
        });
      });

      await upserter.upsert(normalizedTx, classification, tokens);

      // Find the token insert values (first insert is for tokens)
      const tokenInsertValues = capturedValues.values[0] as Record<string, unknown>;

      expect(tokenInsertValues).toBeDefined();
      expect(tokenInsertValues.needs_classification).toBe(true);
      expect(tokenInsertValues.classification_attempts).toBe(0);
      expect(tokenInsertValues.classification_error).toBeNull();
    });

    it('does not update classification fields on conflict (preserves existing state)', async () => {
      const capturedValues: { values: unknown[]; updateSets: unknown[] } = { values: [], updateSets: [] };

      mockTransaction.mockImplementation(async (fn) => {
        const mockInsertTrx = createMockInsertBuilder(
          { id: 'tx-123', chain_alias: 'eth' as ChainAlias },
          capturedValues
        );
        const mockDeleteTrx = createMockDeleteBuilder();

        return fn({
          insertInto: vi.fn().mockReturnValue(mockInsertTrx),
          deleteFrom: vi.fn().mockReturnValue(mockDeleteTrx),
        });
      });

      await upserter.upsert(normalizedTx, classification, tokens);

      // Find the token update set (first onConflict is for tokens)
      const tokenUpdateSet = capturedValues.updateSets[0] as Record<string, unknown>;

      expect(tokenUpdateSet).toBeDefined();
      // Classification fields should NOT be in the update set
      expect(tokenUpdateSet).not.toHaveProperty('needs_classification');
      expect(tokenUpdateSet).not.toHaveProperty('classification_attempts');
      expect(tokenUpdateSet).not.toHaveProperty('classification_error');
      // But other fields should be updated
      expect(tokenUpdateSet).toHaveProperty('name');
      expect(tokenUpdateSet).toHaveProperty('symbol');
      expect(tokenUpdateSet).toHaveProperty('decimals');
      expect(tokenUpdateSet).toHaveProperty('updated_at');
    });

    it('sets correct classification fields when upserting multiple tokens', async () => {
      const capturedValues: { values: unknown[]; updateSets: unknown[] } = { values: [], updateSets: [] };

      mockTransaction.mockImplementation(async (fn) => {
        const mockInsertTrx = createMockInsertBuilder(
          { id: 'tx-123', chain_alias: 'eth' as ChainAlias },
          capturedValues
        );
        const mockDeleteTrx = createMockDeleteBuilder();

        return fn({
          insertInto: vi.fn().mockReturnValue(mockInsertTrx),
          deleteFrom: vi.fn().mockReturnValue(mockDeleteTrx),
        });
      });

      const multipleTokens: TokenInfo[] = [
        { address: '0xtoken1', symbol: 'TK1', name: 'Token One', decimals: 18 },
        { address: '0xtoken2', symbol: 'TK2', name: 'Token Two', decimals: 6 },
        { address: '0xtoken3', symbol: 'TK3', name: 'Token Three', decimals: 8 },
      ];

      const multiTokenClassification: ClassificationResult = {
        type: 'swap',
        direction: 'out',
        confidence: 'high',
        source: 'custom',
        label: 'Token Swap',
        transfers: [
          {
            type: 'token',
            direction: 'out',
            from: '0xsender',
            to: '0xrecipient',
            amount: '1000000',
            token: { address: '0xtoken1', symbol: 'TK1', decimals: 18 },
          },
          {
            type: 'token',
            direction: 'in',
            from: '0xsender',
            to: '0xrecipient',
            amount: '2000000',
            token: { address: '0xtoken2', symbol: 'TK2', decimals: 6 },
          },
        ],
      };

      await upserter.upsert(normalizedTx, multiTokenClassification, multipleTokens);

      // First 3 inserts are for tokens
      for (let i = 0; i < 3; i++) {
        const tokenInsertValues = capturedValues.values[i] as Record<string, unknown>;
        expect(tokenInsertValues.needs_classification).toBe(true);
        expect(tokenInsertValues.classification_attempts).toBe(0);
        expect(tokenInsertValues.classification_error).toBeNull();
      }

      // First 3 update sets are for tokens (on conflict)
      for (let i = 0; i < 3; i++) {
        const tokenUpdateSet = capturedValues.updateSets[i] as Record<string, unknown>;
        expect(tokenUpdateSet).not.toHaveProperty('needs_classification');
        expect(tokenUpdateSet).not.toHaveProperty('classification_attempts');
        expect(tokenUpdateSet).not.toHaveProperty('classification_error');
      }
    });
  });
});
