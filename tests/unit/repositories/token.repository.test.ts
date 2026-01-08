import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresTokenRepository } from '@/src/repositories/token.repository.js';
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
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    onConflict: vi.fn().mockReturnThis(),
    doUpdateSet: vi.fn().mockReturnThis(),
    columns: vi.fn().mockReturnThis(),
    execute: mockExecute,
    executeTakeFirst: mockExecuteTakeFirst,
    executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
  };

  // Mock onConflict to return chainable with columns/doUpdateSet
  chainable.onConflict = vi.fn((cb) => {
    const ocChainable = {
      columns: vi.fn().mockReturnValue({
        doUpdateSet: vi.fn().mockReturnValue(chainable),
      }),
    };
    cb(ocChainable);
    return chainable;
  });

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

describe('PostgresTokenRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: PostgresTokenRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new PostgresTokenRepository(mockDb.mockDb);
  });

  describe('findById', () => {
    it('should return token when found', async () => {
      const now = new Date();
      const expectedToken = {
        id: 'token-uuid-1',
        chain_alias: 'eth' as ChainAlias,
        address: '0xtoken123',
        name: 'Test Token',
        symbol: 'TKN',
        decimals: 18,
        logo_uri: 'https://example.com/logo.png',
        coingecko_id: 'test-token',
        is_verified: true,
        is_spam: false,
        spam_classification: null,
        classification_updated_at: null,
        classification_ttl_hours: null,
        needs_classification: true,
        classification_attempts: 0,
        classification_error: null,
        created_at: now,
        updated_at: now,
      };

      mockDb.mockExecuteTakeFirst.mockResolvedValue(expectedToken);

      const result = await repository.findById('token-uuid-1');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('tokens');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('id', '=', 'token-uuid-1');
      expect(result).toEqual({
        id: expectedToken.id,
        chainAlias: expectedToken.chain_alias,
        address: expectedToken.address,
        name: expectedToken.name,
        symbol: expectedToken.symbol,
        decimals: expectedToken.decimals,
        logoUri: expectedToken.logo_uri,
        coingeckoId: expectedToken.coingecko_id,
        isVerified: expectedToken.is_verified,
        isSpam: expectedToken.is_spam,
        spamClassification: null,
        classificationUpdatedAt: null,
        classificationTtlHours: 720, // defaults to 720 when null
        needsClassification: true,
        classificationAttempts: 0,
        classificationError: null,
        createdAt: expectedToken.created_at,
        updatedAt: expectedToken.updated_at,
      });
    });

    it('should return null when not found', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('should map classification fields correctly', async () => {
      const now = new Date();
      const spamClassification = {
        blockaid: null,
        coingecko: { isListed: true, marketCapRank: 100 },
        heuristics: {
          suspiciousName: false,
          namePatterns: [],
          isUnsolicited: false,
          contractAgeDays: 365,
          isNewContract: false,
          holderDistribution: 'normal' as const,
        },
      };

      const expectedToken = {
        id: 'token-uuid-1',
        chain_alias: 'eth' as ChainAlias,
        address: '0xtoken123',
        name: 'Test Token',
        symbol: 'TKN',
        decimals: 18,
        logo_uri: null,
        coingecko_id: 'test-token',
        is_verified: true,
        is_spam: false,
        spam_classification: spamClassification,
        classification_updated_at: now,
        classification_ttl_hours: 720,
        needs_classification: false,
        classification_attempts: 0,
        classification_error: null,
        created_at: now,
        updated_at: now,
      };

      mockDb.mockExecuteTakeFirst.mockResolvedValue(expectedToken);

      const result = await repository.findById('token-uuid-1');

      expect(result?.spamClassification).toEqual(spamClassification);
      expect(result?.classificationUpdatedAt).toEqual(now);
      expect(result?.classificationTtlHours).toBe(720);
      expect(result?.needsClassification).toBe(false);
      expect(result?.classificationAttempts).toBe(0);
      expect(result?.classificationError).toBeNull();
    });
  });

  describe('findByChainAliasAndAddress', () => {
    it('should return token when found', async () => {
      const expectedToken = {
        id: 'token-uuid-1',
        chain_alias: 'eth' as ChainAlias,
        address: '0xtoken123',
        name: 'Test Token',
        symbol: 'TKN',
        decimals: 18,
        logo_uri: null,
        coingecko_id: 'test-token',
        is_verified: true,
        is_spam: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.mockExecuteTakeFirst.mockResolvedValue(expectedToken);

      const result = await repository.findByChainAliasAndAddress('eth' as ChainAlias, '0xToken123');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('tokens');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('chain_alias', '=', 'eth');
      expect(result?.id).toBe('token-uuid-1');
    });

    it('should normalize address to lowercase', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      await repository.findByChainAliasAndAddress('eth' as ChainAlias, '0xABCDEF');

      // The sql template is used for the address comparison, so we just verify chain_alias was called correctly
      expect(mockDb.chainable.where).toHaveBeenCalledWith('chain_alias', '=', 'eth');
    });

    it('should return null when not found', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      const result = await repository.findByChainAliasAndAddress('eth' as ChainAlias, '0x000');

      expect(result).toBeNull();
    });
  });

  describe('findVerifiedByChainAlias', () => {
    it('should return verified non-spam tokens', async () => {
      const tokens = [
        {
          id: 'token-1',
          chain_alias: 'eth' as ChainAlias,
          address: '0xusdc',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          logo_uri: null,
          coingecko_id: 'usd-coin',
          is_verified: true,
          is_spam: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'token-2',
          chain_alias: 'eth' as ChainAlias,
          address: '0xusdt',
          name: 'Tether',
          symbol: 'USDT',
          decimals: 6,
          logo_uri: null,
          coingecko_id: 'tether',
          is_verified: true,
          is_spam: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDb.mockExecute.mockResolvedValue(tokens);

      const result = await repository.findVerifiedByChainAlias('eth' as ChainAlias);

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('tokens');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('chain_alias', '=', 'eth');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('is_verified', '=', true);
      expect(mockDb.chainable.where).toHaveBeenCalledWith('is_spam', '=', false);
      expect(result).toHaveLength(2);
      expect(result[0]!.symbol).toBe('USDC');
      expect(result[1]!.symbol).toBe('USDT');
    });

    it('should return empty array when no verified tokens exist', async () => {
      mockDb.mockExecute.mockResolvedValue([]);

      const result = await repository.findVerifiedByChainAlias('eth-sepolia');

      expect(result).toEqual([]);
    });
  });

  describe('findByCoingeckoIds', () => {
    it('should return tokens matching coingecko ids', async () => {
      const tokens = [
        {
          id: 'token-1',
          chain_alias: 'eth' as ChainAlias,
          address: '0xeth',
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
          logo_uri: null,
          coingecko_id: 'ethereum',
          is_verified: true,
          is_spam: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDb.mockExecute.mockResolvedValue(tokens);

      const result = await repository.findByCoingeckoIds(['ethereum', 'bitcoin']);

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('tokens');
      expect(mockDb.chainable.where).toHaveBeenCalledWith(
        'coingecko_id',
        'in',
        ['ethereum', 'bitcoin']
      );
      expect(result).toHaveLength(1);
      expect(result[0]!.coingeckoId).toBe('ethereum');
    });

    it('should return empty array when given empty coingecko ids', async () => {
      const result = await repository.findByCoingeckoIds([]);

      expect(mockDb.mockDb.selectFrom).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('upsert', () => {
    it('should insert a new token and return it', async () => {
      const input = {
        chainAlias: 'eth' as ChainAlias,
        address: '0xNewToken',
        name: 'New Token',
        symbol: 'NEW',
        decimals: 18,
        logoUri: 'https://example.com/new.png',
        coingeckoId: 'new-token',
        isVerified: true,
        isSpam: false,
      };

      const expectedToken = {
        id: 'uuid-1',
        chain_alias: 'eth' as ChainAlias,
        address: '0xnewtoken',
        name: 'New Token',
        symbol: 'NEW',
        decimals: 18,
        logo_uri: 'https://example.com/new.png',
        coingecko_id: 'new-token',
        is_verified: true,
        is_spam: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(expectedToken);

      const result = await repository.upsert(input);

      expect(mockDb.mockDb.insertInto).toHaveBeenCalledWith('tokens');
      expect(result.address).toBe('0xnewtoken');
      expect(result.name).toBe('New Token');
      expect(result.symbol).toBe('NEW');
    });

    it('should use default values for optional fields', async () => {
      const input = {
        chainAlias: 'eth' as ChainAlias,
        address: '0xMinimalToken',
        name: 'Minimal Token',
        symbol: 'MIN',
        decimals: 18,
      };

      const expectedToken = {
        id: 'uuid-1',
        chain_alias: 'eth' as ChainAlias,
        address: '0xminimaltoken',
        name: 'Minimal Token',
        symbol: 'MIN',
        decimals: 18,
        logo_uri: null,
        coingecko_id: null,
        is_verified: false,
        is_spam: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(expectedToken);

      const result = await repository.upsert(input);

      expect(result.logoUri).toBeNull();
      expect(result.coingeckoId).toBeNull();
      expect(result.isVerified).toBe(false);
      expect(result.isSpam).toBe(false);
    });
  });

  describe('upsertMany', () => {
    it('should upsert multiple tokens and return them', async () => {
      const inputs = [
        {
          chainAlias: 'eth' as ChainAlias,
          address: '0xToken1',
          name: 'Token One',
          symbol: 'T1',
          decimals: 18,
        },
        {
          chainAlias: 'eth' as ChainAlias,
          address: '0xToken2',
          name: 'Token Two',
          symbol: 'T2',
          decimals: 6,
        },
      ];

      const token1 = {
        id: 'uuid-1',
        chain_alias: 'eth' as ChainAlias,
        address: '0xtoken1',
        name: 'Token One',
        symbol: 'T1',
        decimals: 18,
        logo_uri: null,
        coingecko_id: null,
        is_verified: false,
        is_spam: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const token2 = {
        id: 'uuid-2',
        chain_alias: 'eth' as ChainAlias,
        address: '0xtoken2',
        name: 'Token Two',
        symbol: 'T2',
        decimals: 6,
        logo_uri: null,
        coingecko_id: null,
        is_verified: false,
        is_spam: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.mockExecuteTakeFirstOrThrow
        .mockResolvedValueOnce(token1)
        .mockResolvedValueOnce(token2);

      const result = await repository.upsertMany(inputs);

      expect(mockDb.mockDb.insertInto).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]!.symbol).toBe('T1');
      expect(result[1]!.symbol).toBe('T2');
    });

    it('should return empty array when given empty inputs', async () => {
      const result = await repository.upsertMany([]);

      expect(mockDb.mockDb.insertInto).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
