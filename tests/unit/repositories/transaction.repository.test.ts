import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresTransactionRepository } from '@/src/repositories/transaction.repository.js';
import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

// Create mock Kysely instance
function createMockDb() {
  const mockExecute = vi.fn();
  const mockExecuteTakeFirst = vi.fn();
  const mockExecuteTakeFirstOrThrow = vi.fn();

  const chainable = {
    selectAll: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    execute: mockExecute,
    executeTakeFirst: mockExecuteTakeFirst,
    executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
  };

  const mockDb = {
    selectFrom: vi.fn().mockReturnValue(chainable),
  };

  return {
    mockDb: mockDb as unknown as Kysely<Database>,
    chainable,
    mockExecute,
    mockExecuteTakeFirst,
    mockExecuteTakeFirstOrThrow,
  };
}

// Helper to create a mock transaction row from the database
function createMockTransactionRow(overrides: Partial<{
  id: string;
  chain: string;
  network: string;
  tx_hash: string;
  block_number: string;
  block_hash: string;
  tx_index: number | null;
  from_address: string;
  to_address: string | null;
  value: string;
  fee: string | null;
  status: 'success' | 'failed' | 'pending';
  timestamp: Date;
  classification_type: string | null;
  classification_label: string | null;
  protocol_name: string | null;
  details: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}> = {}) {
  return {
    id: 'tx-uuid-1',
    chain: 'eth' as ChainAlias,
    network: 'mainnet',
    tx_hash: '0xabc123',
    block_number: '12345678',
    block_hash: '0xblock123',
    tx_index: 0,
    from_address: '0xfrom123',
    to_address: '0xto456',
    value: '1000000000000000000',
    fee: '21000000000000',
    status: 'success' as const,
    timestamp: new Date('2024-01-15T10:00:00Z'),
    classification_type: 'transfer',
    classification_label: 'ETH Transfer',
    protocol_name: null,
    details: null,
    created_at: new Date('2024-01-15T10:00:00Z'),
    updated_at: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

// Helper to create a mock native transfer row
function createMockNativeTransferRow(overrides: Partial<{
  id: string;
  tx_id: string;
  chain: string;
  network: string;
  from_address: string | null;
  to_address: string | null;
  amount: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}> = {}) {
  return {
    id: 'native-transfer-uuid-1',
    tx_id: 'tx-uuid-1',
    chain: 'eth' as ChainAlias,
    network: 'mainnet',
    from_address: '0xfrom123',
    to_address: '0xto456',
    amount: '1000000000000000000',
    metadata: null,
    created_at: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

// Helper to create a mock token transfer row
function createMockTokenTransferRow(overrides: Partial<{
  id: string;
  tx_id: string;
  chain: string;
  network: string;
  token_address: string;
  from_address: string | null;
  to_address: string | null;
  amount: string;
  transfer_type: 'transfer' | 'mint' | 'burn' | 'approve';
  metadata: Record<string, unknown> | null;
  created_at: Date;
}> = {}) {
  return {
    id: 'token-transfer-uuid-1',
    tx_id: 'tx-uuid-1',
    chain: 'eth' as ChainAlias,
    network: 'mainnet',
    token_address: '0xusdc123',
    from_address: '0xfrom123',
    to_address: '0xto456',
    amount: '1000000',
    transfer_type: 'transfer' as const,
    metadata: null,
    created_at: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

describe('PostgresTransactionRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: PostgresTransactionRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new PostgresTransactionRepository(mockDb.mockDb);
  });

  describe('findById', () => {
    it('should return transaction when found', async () => {
      const txRow = createMockTransactionRow();
      mockDb.mockExecuteTakeFirst.mockResolvedValue(txRow);

      const result = await repository.findById('tx-uuid-1');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('transactions');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('id', '=', 'tx-uuid-1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('tx-uuid-1');
      expect(result?.txHash).toBe('0xabc123');
    });

    it('should return null when not found', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByTxHash', () => {
    it('should return transaction when found', async () => {
      const txRow = createMockTransactionRow();
      mockDb.mockExecuteTakeFirst.mockResolvedValue(txRow);

      const result = await repository.findByTxHash('eth' as ChainAlias, '0xABC123');

      expect(mockDb.chainable.where).toHaveBeenCalledWith('chain_alias', '=', 'eth');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('tx_hash', '=', '0xabc123');
      expect(result?.txHash).toBe('0xabc123');
    });

    it('should normalize tx hash to lowercase', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      await repository.findByTxHash('eth' as ChainAlias, '0xABC123DEF');

      expect(mockDb.chainable.where).toHaveBeenCalledWith('tx_hash', '=', '0xabc123def');
    });

    it('should return null when not found', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      const result = await repository.findByTxHash('eth' as ChainAlias, '0xnonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByChainAliasAndAddress', () => {
    it('should return transactions with hasMore=false when results <= limit', async () => {
      const txRows = [
        createMockTransactionRow({ id: 'tx-1' }),
        createMockTransactionRow({ id: 'tx-2' }),
      ];
      mockDb.mockExecute.mockResolvedValue(txRows);

      const result = await repository.findByChainAliasAndAddress(
        'eth' as ChainAlias,
        '0xAddress123',
        { limit: 10, sort: 'desc' }
      );

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('address_transactions as at');
      expect(mockDb.chainable.innerJoin).toHaveBeenCalledWith('transactions as t', 't.id', 'at.tx_id');
      // First where call uses sql`LOWER(at.address)` which creates a RawBuilder
      expect(mockDb.chainable.where).toHaveBeenCalledWith(expect.anything(), '=', '0xaddress123');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('at.chain_alias', '=', 'eth');
      expect(mockDb.chainable.limit).toHaveBeenCalledWith(11); // limit + 1
      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('should return hasMore=true when results > limit', async () => {
      // Return limit + 1 results to indicate more are available
      const txRows = [
        createMockTransactionRow({ id: 'tx-1' }),
        createMockTransactionRow({ id: 'tx-2' }),
        createMockTransactionRow({ id: 'tx-3' }),
      ];
      mockDb.mockExecute.mockResolvedValue(txRows);

      const result = await repository.findByChainAliasAndAddress(
        'eth' as ChainAlias,
        '0xAddress123',
        { limit: 2, sort: 'desc' }
      );

      expect(mockDb.chainable.limit).toHaveBeenCalledWith(3); // limit + 1
      expect(result.data).toHaveLength(2); // Only returns 'limit' items
      expect(result.hasMore).toBe(true);
    });

    it('should return empty array when no transactions found', async () => {
      mockDb.mockExecute.mockResolvedValue([]);

      const result = await repository.findByChainAliasAndAddress(
        'eth' as ChainAlias,
        '0xAddress123',
        { limit: 10, sort: 'desc' }
      );

      expect(result.data).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('should normalize address to lowercase', async () => {
      mockDb.mockExecute.mockResolvedValue([]);

      await repository.findByChainAliasAndAddress(
        'eth' as ChainAlias,
        '0xABCDEF123456',
        { limit: 10, sort: 'desc' }
      );

      // Uses sql`LOWER(at.address)` for case-insensitive comparison
      expect(mockDb.chainable.where).toHaveBeenCalledWith(expect.anything(), '=', '0xabcdef123456');
    });

    it('should order by timestamp descending when sort is desc', async () => {
      mockDb.mockExecute.mockResolvedValue([]);

      await repository.findByChainAliasAndAddress(
        'eth' as ChainAlias,
        '0xAddress',
        { limit: 10, sort: 'desc' }
      );

      expect(mockDb.chainable.orderBy).toHaveBeenCalledWith('at.timestamp', 'desc');
      expect(mockDb.chainable.orderBy).toHaveBeenCalledWith('at.tx_id', 'desc');
    });

    it('should order by timestamp ascending when sort is asc', async () => {
      mockDb.mockExecute.mockResolvedValue([]);

      await repository.findByChainAliasAndAddress(
        'eth' as ChainAlias,
        '0xAddress',
        { limit: 10, sort: 'asc' }
      );

      expect(mockDb.chainable.orderBy).toHaveBeenCalledWith('at.timestamp', 'asc');
      expect(mockDb.chainable.orderBy).toHaveBeenCalledWith('at.tx_id', 'asc');
    });

    it('should apply cursor filter when cursor is provided', async () => {
      mockDb.mockExecute.mockResolvedValue([]);
      const cursorTimestamp = new Date('2024-01-15T10:00:00Z');

      await repository.findByChainAliasAndAddress(
        'eth' as ChainAlias,
        '0xAddress',
        {
          limit: 10,
          sort: 'desc',
          cursor: { timestamp: cursorTimestamp, txId: 'tx-cursor-id' },
        }
      );

      // The where method should be called with the cursor condition
      // Note: We can't easily verify the exact SQL template, but we verify it was called
      expect(mockDb.chainable.where).toHaveBeenCalled();
    });
  });

  describe('findNativeTransfersByTxIds', () => {
    it('should return empty array for empty input', async () => {
      const result = await repository.findNativeTransfersByTxIds([]);

      expect(mockDb.mockDb.selectFrom).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return native transfers for given tx ids', async () => {
      const transferRows = [
        createMockNativeTransferRow({ id: 'transfer-1', tx_id: 'tx-1' }),
        createMockNativeTransferRow({ id: 'transfer-2', tx_id: 'tx-2' }),
      ];
      mockDb.mockExecute.mockResolvedValue(transferRows);

      const result = await repository.findNativeTransfersByTxIds(['tx-1', 'tx-2']);

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('native_transfers');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('tx_id', 'in', ['tx-1', 'tx-2']);
      expect(result).toHaveLength(2);
      expect(result[0]!.txId).toBe('tx-1');
      expect(result[0]!.fromAddress).toBe('0xfrom123');
      expect(result[0]!.amount).toBe('1000000000000000000');
    });

    it('should map snake_case to camelCase correctly', async () => {
      const transferRow = createMockNativeTransferRow({
        id: 'native-1',
        tx_id: 'tx-1',
        from_address: '0xsender',
        to_address: '0xreceiver',
      });
      mockDb.mockExecute.mockResolvedValue([transferRow]);

      const result = await repository.findNativeTransfersByTxIds(['tx-1']);

      expect(result[0]).toEqual(expect.objectContaining({
        id: 'native-1',
        txId: 'tx-1',
        fromAddress: '0xsender',
        toAddress: '0xreceiver',
      }));
    });
  });

  describe('findTokenTransfersByTxIds', () => {
    it('should return empty array for empty input', async () => {
      const result = await repository.findTokenTransfersByTxIds([]);

      expect(mockDb.mockDb.selectFrom).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return token transfers for given tx ids', async () => {
      const transferRows = [
        createMockTokenTransferRow({ id: 'transfer-1', tx_id: 'tx-1' }),
        createMockTokenTransferRow({ id: 'transfer-2', tx_id: 'tx-2' }),
      ];
      mockDb.mockExecute.mockResolvedValue(transferRows);

      const result = await repository.findTokenTransfersByTxIds(['tx-1', 'tx-2']);

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('token_transfers');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('tx_id', 'in', ['tx-1', 'tx-2']);
      expect(result).toHaveLength(2);
      expect(result[0]!.txId).toBe('tx-1');
      expect(result[0]!.tokenAddress).toBe('0xusdc123');
    });

    it('should map snake_case to camelCase correctly', async () => {
      const transferRow = createMockTokenTransferRow({
        id: 'token-1',
        tx_id: 'tx-1',
        token_address: '0xtoken',
        from_address: '0xsender',
        to_address: '0xreceiver',
        transfer_type: 'mint',
      });
      mockDb.mockExecute.mockResolvedValue([transferRow]);

      const result = await repository.findTokenTransfersByTxIds(['tx-1']);

      expect(result[0]).toEqual(expect.objectContaining({
        id: 'token-1',
        txId: 'tx-1',
        tokenAddress: '0xtoken',
        fromAddress: '0xsender',
        toAddress: '0xreceiver',
        transferType: 'mint',
      }));
    });
  });
});
