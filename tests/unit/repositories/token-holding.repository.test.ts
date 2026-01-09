import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresTokenHoldingRepository } from '@/src/repositories/token-holding.repository.js';
import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';
import type { CreateTokenHoldingInput } from '@/src/repositories/types.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

// Hoist the mock function
const { mockSql } = vi.hoisted(() => ({
  mockSql: vi.fn(),
}));

// Mock SQL template literal
vi.mock('kysely', async () => {
  const actual = await vi.importActual('kysely');
  return {
    ...actual,
    sql: mockSql,
  };
});

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
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    execute: mockExecute,
    executeTakeFirst: mockExecuteTakeFirst,
    executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
  };

  const mockDb = {
    selectFrom: vi.fn().mockReturnValue(chainable),
    insertInto: vi.fn().mockReturnValue(chainable),
    updateTable: vi.fn().mockReturnValue(chainable),
    deleteFrom: vi.fn().mockReturnValue(chainable),
  };

  return {
    mockDb: mockDb as unknown as Kysely<Database>,
    chainable,
    mockExecute,
    mockExecuteTakeFirst,
    mockExecuteTakeFirstOrThrow,
  };
}

describe('PostgresTokenHoldingRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: PostgresTokenHoldingRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    repository = new PostgresTokenHoldingRepository(mockDb.mockDb);
  });

  describe('findByAddressId', () => {
    it('should return all token holdings for an address', async () => {
      const holdings = [
        {
          id: 'holding-1',
          address_id: 'addr-1',
          chain: 'eth' as ChainAlias,
          network: 'mainnet',
          token_address: null,
          is_native: true,
          balance: '1000000000000000000',
          decimals: 18,
          name: 'Ethereum',
          symbol: 'ETH',
          visibility: 'visible',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'holding-2',
          address_id: 'addr-1',
          chain: 'eth' as ChainAlias,
          network: 'mainnet',
          token_address: '0xusdc',
          is_native: false,
          balance: '1000000',
          decimals: 6,
          name: 'USD Coin',
          symbol: 'USDC',
          visibility: 'visible',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDb.mockExecute.mockResolvedValue(holdings);

      const result = await repository.findByAddressId('addr-1');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('token_holdings');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('address_id', '=', 'addr-1');
      expect(mockDb.chainable.orderBy).toHaveBeenCalledWith('is_native', 'desc');
      expect(mockDb.chainable.orderBy).toHaveBeenCalledWith('symbol', 'asc');
      expect(result).toHaveLength(2);
      expect(result[0]!.isNative).toBe(true);
      expect(result[1]!.tokenAddress).toBe('0xusdc');
    });

    it('should return empty array when no holdings exist', async () => {
      mockDb.mockExecute.mockResolvedValue([]);

      const result = await repository.findByAddressId('addr-1');

      expect(result).toEqual([]);
    });
  });

  describe('findVisibleByAddressId', () => {
    it('should return only visible token holdings', async () => {
      const visibleHoldings = [
        {
          id: 'holding-1',
          address_id: 'addr-1',
          chain: 'eth' as ChainAlias,
          network: 'mainnet',
          token_address: null,
          is_native: true,
          balance: '1000000000000000000',
          decimals: 18,
          name: 'Ethereum',
          symbol: 'ETH',
          visibility: 'visible',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDb.mockExecute.mockResolvedValue(visibleHoldings);

      const result = await repository.findVisibleByAddressId('addr-1');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('token_holdings');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('address_id', '=', 'addr-1');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('visibility', '=', 'visible');
      expect(result).toHaveLength(1);
      expect(result[0]!.visibility).toBe('visible');
    });
  });

  describe('upsert', () => {
    it('should insert a new token holding', async () => {
      const input: CreateTokenHoldingInput = {
        addressId: 'addr-1',
        chainAlias: 'eth' as ChainAlias,
        tokenAddress: '0xusdc',
        isNative: false,
        balance: '1000000',
        decimals: 6,
        name: 'USD Coin',
        symbol: 'USDC',
      };

      const expectedHolding = {
        id: 'holding-uuid',
        address_id: 'addr-1',
        chain: 'eth',
        network: 'mainnet',
        token_address: '0xusdc',
        is_native: false,
        balance: '1000000',
        decimals: 6,
        name: 'USD Coin',
        symbol: 'USDC',
        visibility: 'visible',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock the SQL template literal to return an object with execute method
      mockSql.mockReturnValue({
        execute: vi.fn().mockResolvedValue({ rows: [expectedHolding] }),
      });

      const result = await repository.upsert(input);

      expect(result.addressId).toBe('addr-1');
      expect(result.tokenAddress).toBe('0xusdc');
      expect(result.symbol).toBe('USDC');
    });

    it('should normalize token address to lowercase', async () => {
      const input: CreateTokenHoldingInput = {
        addressId: 'addr-1',
        chainAlias: 'eth' as ChainAlias,
        tokenAddress: '0xABCDEF',
        isNative: false,
        balance: '1000',
        decimals: 18,
        name: 'Test',
        symbol: 'TEST',
      };

      const expectedHolding = {
        id: 'holding-uuid',
        address_id: 'addr-1',
        chain: 'eth',
        network: 'mainnet',
        token_address: '0xabcdef',
        is_native: false,
        balance: '1000',
        decimals: 18,
        name: 'Test',
        symbol: 'TEST',
        visibility: 'visible',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSql.mockReturnValue({
        execute: vi.fn().mockResolvedValue({ rows: [expectedHolding] }),
      });

      const result = await repository.upsert(input);

      expect(result.tokenAddress).toBe('0xabcdef');
    });

    it('should handle native token (null tokenAddress)', async () => {
      const input: CreateTokenHoldingInput = {
        addressId: 'addr-1',
        chainAlias: 'eth' as ChainAlias,
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      };

      const expectedHolding = {
        id: 'holding-uuid',
        address_id: 'addr-1',
        chain: 'eth',
        network: 'mainnet',
        token_address: null,
        is_native: true,
        balance: '1000000000000000000',
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
        visibility: 'visible',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSql.mockReturnValue({
        execute: vi.fn().mockResolvedValue({ rows: [expectedHolding] }),
      });

      const result = await repository.upsert(input);

      expect(result.tokenAddress).toBeNull();
      expect(result.isNative).toBe(true);
    });

    it('should throw error when upsert fails', async () => {
      const input: CreateTokenHoldingInput = {
        addressId: 'addr-1',
        chainAlias: 'eth' as ChainAlias,
        tokenAddress: '0xtoken',
        isNative: false,
        balance: '1000',
        decimals: 18,
        name: 'Test',
        symbol: 'TEST',
      };

      mockSql.mockReturnValue({
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      });

      await expect(repository.upsert(input)).rejects.toThrow('Failed to upsert token holding');
    });
  });

  describe('updateVisibility', () => {
    it('should update visibility to hidden', async () => {
      const updatedHolding = {
        id: 'holding-1',
        address_id: 'addr-1',
        chain: 'eth',
        network: 'mainnet',
        token_address: '0xtoken',
        is_native: false,
        balance: '1000',
        decimals: 18,
        name: 'Test',
        symbol: 'TEST',
        visibility: 'hidden',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(updatedHolding);

      const result = await repository.updateVisibility('holding-1', 'hidden');

      expect(mockDb.mockDb.updateTable).toHaveBeenCalledWith('token_holdings');
      expect(mockDb.chainable.set).toHaveBeenCalledWith({
        visibility: 'hidden',
        updated_at: expect.any(String),
      });
      expect(mockDb.chainable.where).toHaveBeenCalledWith('id', '=', 'holding-1');
      expect(result.visibility).toBe('hidden');
    });

    it('should update visibility to visible', async () => {
      const updatedHolding = {
        id: 'holding-1',
        address_id: 'addr-1',
        chain: 'eth',
        network: 'mainnet',
        token_address: '0xtoken',
        is_native: false,
        balance: '1000',
        decimals: 18,
        name: 'Test',
        symbol: 'TEST',
        visibility: 'visible',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(updatedHolding);

      const result = await repository.updateVisibility('holding-1', 'visible');

      expect(result.visibility).toBe('visible');
    });
  });

  describe('updateSpamOverride', () => {
    it('should set spam override to trusted', async () => {
      // First create a token holding
      const input: CreateTokenHoldingInput = {
        addressId: 'addr-1',
        chainAlias: 'eth' as ChainAlias,
        tokenAddress: '0xtoken123',
        isNative: false,
        balance: '1000000000',
        decimals: 18,
        name: 'Test Token',
        symbol: 'TEST',
      };

      const createdHolding = {
        id: 'holding-uuid',
        address_id: 'addr-1',
        chain: 'eth',
        network: 'mainnet',
        token_address: '0xtoken123',
        is_native: false,
        balance: '1000000000',
        decimals: 18,
        name: 'Test Token',
        symbol: 'TEST',
        visibility: 'visible',
        user_spam_override: null,
        override_updated_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSql.mockReturnValue({
        execute: vi.fn().mockResolvedValue({ rows: [createdHolding] }),
      });

      await repository.upsert(input);

      // Update spam override
      const updatedHolding = {
        ...createdHolding,
        user_spam_override: 'trusted',
        override_updated_at: new Date(),
      };

      mockDb.mockExecuteTakeFirst.mockResolvedValue(updatedHolding);

      const result = await repository.updateSpamOverride('addr-1', '0xtoken123', 'trusted');

      expect(result).not.toBeNull();
      expect(result?.userSpamOverride).toBe('trusted');
      expect(result?.overrideUpdatedAt).toBeInstanceOf(Date);
    });

    it('should set spam override to spam', async () => {
      const input: CreateTokenHoldingInput = {
        addressId: 'addr-2',
        chainAlias: 'eth' as ChainAlias,
        tokenAddress: '0xtoken456',
        isNative: false,
        balance: '1000000000',
        decimals: 18,
        name: 'Test Token',
        symbol: 'TEST',
      };

      const createdHolding = {
        id: 'holding-uuid',
        address_id: 'addr-2',
        chain: 'eth',
        network: 'mainnet',
        token_address: '0xtoken456',
        is_native: false,
        balance: '1000000000',
        decimals: 18,
        name: 'Test Token',
        symbol: 'TEST',
        visibility: 'visible',
        user_spam_override: null,
        override_updated_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSql.mockReturnValue({
        execute: vi.fn().mockResolvedValue({ rows: [createdHolding] }),
      });

      await repository.upsert(input);

      const updatedHolding = {
        ...createdHolding,
        user_spam_override: 'spam',
        override_updated_at: new Date(),
      };

      mockDb.mockExecuteTakeFirst.mockResolvedValue(updatedHolding);

      const result = await repository.updateSpamOverride('addr-2', '0xtoken456', 'spam');

      expect(result).not.toBeNull();
      expect(result?.userSpamOverride).toBe('spam');
      expect(result?.overrideUpdatedAt).toBeInstanceOf(Date);
    });

    it('should clear spam override when set to null', async () => {
      const input: CreateTokenHoldingInput = {
        addressId: 'addr-3',
        chainAlias: 'eth' as ChainAlias,
        tokenAddress: '0xtoken789',
        isNative: false,
        balance: '1000000000',
        decimals: 18,
        name: 'Test Token',
        symbol: 'TEST',
      };

      const createdHolding = {
        id: 'holding-uuid',
        address_id: 'addr-3',
        chain: 'eth',
        network: 'mainnet',
        token_address: '0xtoken789',
        is_native: false,
        balance: '1000000000',
        decimals: 18,
        name: 'Test Token',
        symbol: 'TEST',
        visibility: 'visible',
        user_spam_override: 'trusted',
        override_updated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSql.mockReturnValue({
        execute: vi.fn().mockResolvedValue({ rows: [createdHolding] }),
      });

      await repository.upsert(input);

      // First set an override (simulate it was set previously)
      const overrideSetHolding = {
        ...createdHolding,
        user_spam_override: 'trusted',
        override_updated_at: new Date(),
      };

      mockDb.mockExecuteTakeFirst.mockResolvedValue(overrideSetHolding);

      await repository.updateSpamOverride('addr-3', '0xtoken789', 'trusted');

      // Then clear it
      const clearedHolding = {
        ...createdHolding,
        user_spam_override: null,
        override_updated_at: null,
      };

      mockDb.mockExecuteTakeFirst.mockResolvedValue(clearedHolding);

      const result = await repository.updateSpamOverride('addr-3', '0xtoken789', null);

      expect(result).not.toBeNull();
      expect(result?.userSpamOverride).toBeNull();
      expect(result?.overrideUpdatedAt).toBeNull();
    });

    it('should handle native tokens with null tokenAddress', async () => {
      const input: CreateTokenHoldingInput = {
        addressId: 'addr-4',
        chainAlias: 'eth' as ChainAlias,
        tokenAddress: null,
        isNative: true,
        balance: '1000000000',
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
      };

      const createdHolding = {
        id: 'holding-uuid',
        address_id: 'addr-4',
        chain: 'eth',
        network: 'mainnet',
        token_address: null,
        is_native: true,
        balance: '1000000000',
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
        visibility: 'visible',
        user_spam_override: null,
        override_updated_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSql.mockReturnValue({
        execute: vi.fn().mockResolvedValue({ rows: [createdHolding] }),
      });

      await repository.upsert(input);

      const updatedHolding = {
        ...createdHolding,
        user_spam_override: 'trusted',
        override_updated_at: new Date(),
      };

      mockDb.mockExecuteTakeFirst.mockResolvedValue(updatedHolding);

      const result = await repository.updateSpamOverride('addr-4', null, 'trusted');

      expect(result).not.toBeNull();
      expect(result?.userSpamOverride).toBe('trusted');
      expect(result?.isNative).toBe(true);
    });

    it('should return null when no matching token holding exists', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      const result = await repository.updateSpamOverride('non-existent', '0xnotfound', 'trusted');

      expect(result).toBeNull();
    });
  });

  describe('upsertMany', () => {
    it('should return empty array when given empty input', async () => {
      const result = await repository.upsertMany([]);

      expect(result).toEqual([]);
    });

    it('should upsert a single token holding', async () => {
      const input: CreateTokenHoldingInput = {
        addressId: 'addr-1',
        chainAlias: 'eth' as ChainAlias,
        tokenAddress: '0xusdc',
        isNative: false,
        balance: '1000000',
        decimals: 6,
        name: 'USD Coin',
        symbol: 'USDC',
      };

      const expectedHolding = {
        id: 'holding-uuid',
        address_id: 'addr-1',
        chain_alias: 'eth',
        token_address: '0xusdc',
        is_native: false,
        balance: '1000000',
        decimals: 6,
        name: 'USD Coin',
        symbol: 'USDC',
        visibility: 'visible',
        user_spam_override: null,
        override_updated_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSql.mockReturnValue({
        execute: vi.fn().mockResolvedValue({ rows: [expectedHolding] }),
      });

      const result = await repository.upsertMany([input]);

      expect(result).toHaveLength(1);
      expect(result[0]!.addressId).toBe('addr-1');
      expect(result[0]!.tokenAddress).toBe('0xusdc');
      expect(result[0]!.symbol).toBe('USDC');
    });

    it('should upsert multiple token holdings', async () => {
      const inputs: CreateTokenHoldingInput[] = [
        {
          addressId: 'addr-1',
          chainAlias: 'eth' as ChainAlias,
          tokenAddress: null,
          isNative: true,
          balance: '1000000000000000000',
          decimals: 18,
          name: 'Ethereum',
          symbol: 'ETH',
        },
        {
          addressId: 'addr-1',
          chainAlias: 'eth' as ChainAlias,
          tokenAddress: '0xusdc',
          isNative: false,
          balance: '1000000',
          decimals: 6,
          name: 'USD Coin',
          symbol: 'USDC',
        },
        {
          addressId: 'addr-1',
          chainAlias: 'eth' as ChainAlias,
          tokenAddress: '0xdai',
          isNative: false,
          balance: '2000000000000000000',
          decimals: 18,
          name: 'Dai',
          symbol: 'DAI',
        },
      ];

      const expectedHoldings = [
        {
          id: 'holding-1',
          address_id: 'addr-1',
          chain_alias: 'eth',
          token_address: null,
          is_native: true,
          balance: '1000000000000000000',
          decimals: 18,
          name: 'Ethereum',
          symbol: 'ETH',
          visibility: 'visible',
          user_spam_override: null,
          override_updated_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'holding-2',
          address_id: 'addr-1',
          chain_alias: 'eth',
          token_address: '0xusdc',
          is_native: false,
          balance: '1000000',
          decimals: 6,
          name: 'USD Coin',
          symbol: 'USDC',
          visibility: 'visible',
          user_spam_override: null,
          override_updated_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'holding-3',
          address_id: 'addr-1',
          chain_alias: 'eth',
          token_address: '0xdai',
          is_native: false,
          balance: '2000000000000000000',
          decimals: 18,
          name: 'Dai',
          symbol: 'DAI',
          visibility: 'visible',
          user_spam_override: null,
          override_updated_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      // Mock sql to return different holdings for each call
      let callIndex = 0;
      mockSql.mockImplementation(() => ({
        execute: vi.fn().mockResolvedValue({ rows: [expectedHoldings[callIndex++]] }),
      }));

      const result = await repository.upsertMany(inputs);

      expect(result).toHaveLength(3);
      expect(result[0]!.isNative).toBe(true);
      expect(result[0]!.symbol).toBe('ETH');
      expect(result[1]!.tokenAddress).toBe('0xusdc');
      expect(result[1]!.symbol).toBe('USDC');
      expect(result[2]!.tokenAddress).toBe('0xdai');
      expect(result[2]!.symbol).toBe('DAI');
    });

    it('should update existing holdings on conflict', async () => {
      const input: CreateTokenHoldingInput = {
        addressId: 'addr-1',
        chainAlias: 'eth' as ChainAlias,
        tokenAddress: '0xusdc',
        isNative: false,
        balance: '2000000', // Updated balance
        decimals: 6,
        name: 'USD Coin',
        symbol: 'USDC',
      };

      const updatedHolding = {
        id: 'existing-holding-id',
        address_id: 'addr-1',
        chain_alias: 'eth',
        token_address: '0xusdc',
        is_native: false,
        balance: '2000000',
        decimals: 6,
        name: 'USD Coin',
        symbol: 'USDC',
        visibility: 'visible',
        user_spam_override: null,
        override_updated_at: null,
        created_at: new Date('2024-01-01'),
        updated_at: new Date(), // Updated timestamp
      };

      mockSql.mockReturnValue({
        execute: vi.fn().mockResolvedValue({ rows: [updatedHolding] }),
      });

      const result = await repository.upsertMany([input]);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('existing-holding-id');
      expect(result[0]!.balance).toBe('2000000');
    });
  });
});
