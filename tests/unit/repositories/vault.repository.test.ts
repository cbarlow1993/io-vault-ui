import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresVaultRepository } from '@/src/repositories/vault.repository.js';
import type { Kysely } from 'kysely';
import type { VaultDatabase } from '@/src/lib/database/types.js';

// Create mock Kysely instance
function createMockDb() {
  const mockExecuteTakeFirst = vi.fn();

  const chainable = {
    selectAll: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    execute: vi.fn(),
    executeTakeFirst: mockExecuteTakeFirst,
  };

  const mockDb = {
    selectFrom: vi.fn().mockReturnValue(chainable),
  };

  return {
    mockDb: mockDb as unknown as Kysely<VaultDatabase>,
    chainable,
    mockExecuteTakeFirst,
  };
}

describe('PostgresVaultRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: PostgresVaultRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new PostgresVaultRepository(mockDb.mockDb);
  });

  describe('vaultExists', () => {
    it('should return true when vault exists', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue({ id: 'vault-123' });

      const result = await repository.vaultExists('vault-123');

      expect(result).toBe(true);
      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('Vault');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('id', '=', 'vault-123');
    });

    it('should return false when vault does not exist', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      const result = await repository.vaultExists('vault-123');

      expect(result).toBe(false);
    });
  });

  describe('findById', () => {
    it('should return vault when found', async () => {
      const expectedVault = {
        id: 'vault-123',
        workspaceId: 'ws-456',
        organisationId: 'org-789',
        createdAt: new Date(),
      };

      mockDb.mockExecuteTakeFirst.mockResolvedValue(expectedVault);

      const result = await repository.findById('vault-123');

      expect(result).toEqual(expectedVault);
      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('Vault');
    });

    it('should return null when vault not found', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      const result = await repository.findById('vault-123');

      expect(result).toBeNull();
    });
  });

  describe('findVaultDetails', () => {
    it('should return vault details when found', async () => {
      const dbResult = {
        id: 'vault-123',
        workspaceId: 'ws-456',
        organisationId: 'org-789',
      };

      mockDb.mockExecuteTakeFirst.mockResolvedValue(dbResult);

      const result = await repository.findVaultDetails('vault-123');

      expect(result).toEqual({
        vaultId: 'vault-123',
        workspaceId: 'ws-456',
        organisationId: 'org-789',
      });
    });

    it('should return null when vault not found', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      const result = await repository.findVaultDetails('vault-123');

      expect(result).toBeNull();
    });
  });
});
