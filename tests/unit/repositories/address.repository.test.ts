import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresAddressRepository } from '@/src/repositories/address.repository.js';
import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/index.js';

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

describe('PostgresAddressRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: PostgresAddressRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new PostgresAddressRepository(mockDb.mockDb);
  });

  describe('create', () => {
    it('should insert a new address and return it', async () => {
      const input = {
        address: '0x123',
        chainAlias: 'eth' as ChainAlias,
        ecosystem: 'evm',
        vaultId: 'vault-1',
        workspaceId: 'workspace-1',
        organisationId: 'org-1',
        derivationPath: "m/44'/60'/0'/0/0",
      };

      const expectedAddress = {
        id: 'uuid-1',
        address: '0x123',
        chain: 'ETH',
        vault_id: 'vault-1',
        organisation_id: 'org-1',
        derivation_path: "m/44'/60'/0'/0/0",
        is_monitored: false,
        subscription_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(expectedAddress);

      const result = await repository.create(input);

      expect(mockDb.mockDb.insertInto).toHaveBeenCalledWith('addresses');
      expect(result).toEqual(expectedAddress);
    });
  });

  describe('findById', () => {
    it('should return address when found', async () => {
      const expectedAddress = {
        id: 'uuid-1',
        address: '0x123',
        chain: 'ETH',
        vault_id: 'vault-1',
        organisation_id: 'org-1',
      };

      mockDb.mockExecuteTakeFirst.mockResolvedValue(expectedAddress);

      const result = await repository.findById('uuid-1');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('addresses');
      expect(result).toEqual(expectedAddress);
    });

    it('should return null when not found', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByAddressAndChainAlias', () => {
    it('should return address when found', async () => {
      const expectedAddress = {
        id: 'uuid-1',
        address: '0x123',
        chain_alias: 'ETH',
        vault_id: 'vault-1',
        organisation_id: 'org-1',
      };

      mockDb.mockExecuteTakeFirst.mockResolvedValue(expectedAddress);

      const result = await repository.findByAddressAndChainAlias('0x123', 'eth' as ChainAlias);

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('addresses');
      // First where call uses sql`LOWER(address)` which creates a RawBuilder
      expect(mockDb.chainable.where).toHaveBeenCalledWith(expect.anything(), '=', '0x123');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('chain_alias', '=', 'eth');
      expect(result).toEqual(expectedAddress);
    });

    it('should return null when not found', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      const result = await repository.findByAddressAndChainAlias('0x456', 'bitcoin' as ChainAlias);

      expect(result).toBeNull();
    });
  });

  describe('findByVaultId', () => {
    it('should return paginated addresses', async () => {
      const addresses = [
        { id: 'uuid-1', address: '0x123', vault_id: 'vault-1' },
        { id: 'uuid-2', address: '0x456', vault_id: 'vault-1' },
      ];

      mockDb.mockExecute.mockResolvedValue(addresses);
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue({ count: 2 });

      const result = await repository.findByVaultId('vault-1');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('addresses');
      expect(result.data).toEqual(addresses);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should apply pagination options', async () => {
      const addresses = [{ id: 'uuid-2', address: '0x456', vault_id: 'vault-1' }];

      mockDb.mockExecute.mockResolvedValue(addresses);
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue({ count: 10 });

      const result = await repository.findByVaultId('vault-1', { limit: 1, offset: 1 });

      expect(mockDb.chainable.limit).toHaveBeenCalledWith(1);
      expect(mockDb.chainable.offset).toHaveBeenCalledWith(1);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('findBySubscriptionId', () => {
    it('should return addresses with matching subscription id', async () => {
      const addresses = [
        { id: 'uuid-1', address: '0x123', subscription_id: 'sub-123' },
      ];

      mockDb.mockExecute.mockResolvedValue(addresses);

      const result = await repository.findBySubscriptionId('sub-123');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('addresses');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('subscription_id', '=', 'sub-123');
      expect(result).toEqual(addresses);
    });
  });

  describe('findMonitoredByVaultId', () => {
    it('should return monitored addresses for vault', async () => {
      const addresses = [
        { id: 'uuid-1', address: '0x123', vault_id: 'vault-1', is_monitored: true },
      ];

      mockDb.mockExecute.mockResolvedValue(addresses);

      const result = await repository.findMonitoredByVaultId('vault-1');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('addresses');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('vault_id', '=', 'vault-1');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('is_monitored', '=', true);
      expect(result).toEqual(addresses);
    });
  });

  describe('findByOrganisationId', () => {
    it('should return paginated addresses for organisation', async () => {
      const addresses = [
        { id: 'uuid-1', address: '0x123', organisation_id: 'org-1' },
      ];

      mockDb.mockExecute.mockResolvedValue(addresses);
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue({ count: 1 });

      const result = await repository.findByOrganisationId('org-1');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('addresses');
      expect(result.data).toEqual(addresses);
      expect(result.total).toBe(1);
    });
  });

  describe('setMonitored', () => {
    it('should update monitoring status and subscription', async () => {
      const updatedAddress = {
        id: 'uuid-1',
        is_monitored: true,
        subscription_id: 'sub-123',
      };

      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(updatedAddress);

      const result = await repository.setMonitored('uuid-1', 'sub-123');

      expect(mockDb.mockDb.updateTable).toHaveBeenCalledWith('addresses');
      expect(result.is_monitored).toBe(true);
      expect(result.subscription_id).toBe('sub-123');
    });
  });

  describe('setUnmonitored', () => {
    it('should clear monitoring status and subscription', async () => {
      const updatedAddress = {
        id: 'uuid-1',
        is_monitored: false,
        subscription_id: null,
      };

      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(updatedAddress);

      const result = await repository.setUnmonitored('uuid-1');

      expect(mockDb.mockDb.updateTable).toHaveBeenCalledWith('addresses');
      expect(result.is_monitored).toBe(false);
      expect(result.subscription_id).toBeNull();
    });
  });

  describe('addToken', () => {
    it('should insert a new token for an address', async () => {
      const expectedToken = {
        id: 'token-uuid-1',
        address_id: 'uuid-1',
        contract_address: '0xtoken',
        symbol: 'TKN',
        decimals: 18,
        name: 'Token',
        created_at: new Date(),
      };

      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(expectedToken);

      const result = await repository.addToken('uuid-1', {
        contractAddress: '0xtoken',
        symbol: 'TKN',
        decimals: 18,
        name: 'Token',
      });

      expect(mockDb.mockDb.insertInto).toHaveBeenCalledWith('address_tokens');
      expect(result).toEqual(expectedToken);
    });
  });

  describe('removeToken', () => {
    it('should delete token from address', async () => {
      mockDb.mockExecute.mockResolvedValue([]);

      await repository.removeToken('uuid-1', '0xtoken');

      expect(mockDb.mockDb.deleteFrom).toHaveBeenCalledWith('address_tokens');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('address_id', '=', 'uuid-1');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('contract_address', '=', '0xtoken');
    });
  });

  describe('findTokensByAddressId', () => {
    it('should return tokens for an address', async () => {
      const tokens = [
        { id: 'token-1', address_id: 'uuid-1', contract_address: '0xtoken1' },
        { id: 'token-2', address_id: 'uuid-1', contract_address: '0xtoken2' },
      ];

      mockDb.mockExecute.mockResolvedValue(tokens);

      const result = await repository.findTokensByAddressId('uuid-1');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('address_tokens');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('address_id', '=', 'uuid-1');
      expect(result).toEqual(tokens);
    });
  });

  describe('createMany', () => {
    it('should insert multiple addresses', async () => {
      const inputs = [
        { address: '0x123', chainAlias: 'eth' as ChainAlias, ecosystem: 'evm', vaultId: 'vault-1', workspaceId: 'workspace-1', organisationId: 'org-1' },
        { address: '0x456', chainAlias: 'bitcoin' as ChainAlias, ecosystem: 'utxo', vaultId: 'vault-1', workspaceId: 'workspace-1', organisationId: 'org-1' },
      ];

      const expectedAddresses = [
        { id: 'uuid-1', address: '0x123', chain_alias: 'ETH' },
        { id: 'uuid-2', address: '0x456', chain_alias: 'BTC' },
      ];

      mockDb.mockExecute.mockResolvedValue(expectedAddresses);

      const result = await repository.createMany(inputs);

      expect(mockDb.mockDb.insertInto).toHaveBeenCalledWith('addresses');
      expect(result).toEqual(expectedAddresses);
    });

    it('should return empty array when no inputs provided', async () => {
      const result = await repository.createMany([]);

      expect(mockDb.mockDb.insertInto).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('deleteByVaultId', () => {
    it('should delete all addresses for a vault and return count', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue({ numDeletedRows: BigInt(5) });

      const result = await repository.deleteByVaultId('vault-1');

      expect(mockDb.mockDb.deleteFrom).toHaveBeenCalledWith('addresses');
      expect(result).toBe(5);
    });
  });

  describe('findAllMonitored', () => {
    it('should return all addresses where is_monitored is true', async () => {
      const monitoredAddresses = [
        { id: 'uuid-1', address: '0x123', vault_id: 'vault-1', is_monitored: true },
        { id: 'uuid-2', address: '0x456', vault_id: 'vault-2', is_monitored: true },
      ];

      mockDb.mockExecute.mockResolvedValue(monitoredAddresses);

      const result = await repository.findAllMonitored();

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('addresses');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('is_monitored', '=', true);
      expect(result).toEqual(monitoredAddresses);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no monitored addresses exist', async () => {
      mockDb.mockExecute.mockResolvedValue([]);

      const result = await repository.findAllMonitored();

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('addresses');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('is_monitored', '=', true);
      expect(result).toEqual([]);
    });
  });

  describe('updateLastReconciledBlock', () => {
    it('should update last_reconciled_block and return updated address', async () => {
      const updatedAddress = {
        id: 'uuid-1',
        address: '0x123',
        vault_id: 'vault-1',
        is_monitored: true,
        last_reconciled_block: 12345678,
        updated_at: new Date(),
      };

      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(updatedAddress);

      const result = await repository.updateLastReconciledBlock('uuid-1', 12345678);

      expect(mockDb.mockDb.updateTable).toHaveBeenCalledWith('addresses');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('id', '=', 'uuid-1');
      expect(result.last_reconciled_block).toBe(12345678);
    });

    it('should throw when address not found', async () => {
      mockDb.mockExecuteTakeFirstOrThrow.mockRejectedValue(new Error('no result'));

      await expect(repository.updateLastReconciledBlock('non-existent', 100)).rejects.toThrow();
    });
  });
});
