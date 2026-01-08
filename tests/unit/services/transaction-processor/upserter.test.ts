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
 */
function createMockInsertBuilder(returnValue?: unknown) {
  const mockBuilder: Record<string, unknown> = {};

  // Build the chain from the end backwards
  mockBuilder.execute = vi.fn().mockResolvedValue(returnValue);
  mockBuilder.executeTakeFirstOrThrow = vi.fn().mockResolvedValue(returnValue);
  mockBuilder.returningAll = vi.fn().mockReturnValue(mockBuilder);
  mockBuilder.doUpdateSet = vi.fn().mockReturnValue(mockBuilder);
  mockBuilder.columns = vi.fn().mockReturnValue(mockBuilder);
  mockBuilder.onConflict = vi.fn().mockImplementation((cb: (oc: unknown) => unknown) => {
    // Call the callback with a mock that returns doUpdateSet
    cb({
      columns: vi.fn().mockReturnValue({
        doUpdateSet: vi.fn().mockReturnValue(mockBuilder),
      }),
    });
    return mockBuilder;
  });
  mockBuilder.values = vi.fn().mockReturnValue(mockBuilder);
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
});
