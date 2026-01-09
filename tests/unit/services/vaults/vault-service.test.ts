import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultService } from '@/src/services/vaults/vault-service.js';
import { Vault } from '@/src/domain/entities/index.js';
import type { VaultRepository, VaultWithDetails } from '@/src/repositories/vault.repository.js';

// Mock the external SDK dependencies
vi.mock('@iofinnet/io-core-dapp-utils-chains-sdk', () => ({
  Chain: {
    fromAlias: vi.fn().mockResolvedValue({
      Config: { ecosystem: 'EVM' },
    }),
  },
  EcoSystem: {
    EVM: 'EVM',
    TVM: 'TVM',
    UTXO: 'UTXO',
    SVM: 'SVM',
    XRP: 'XRP',
  },
}));

vi.mock('@/utils/powertools.js', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('VaultService', () => {
  let vaultService: VaultService;
  let mockVaultRepository: VaultRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockVaultRepository = {
      findById: vi.fn(),
      findWorkspaceId: vi.fn(),
      findVaultDetails: vi.fn(),
      findVaultXpub: vi.fn(),
      findVaultCurves: vi.fn(),
      findTagAssignment: vi.fn(),
      findVaultWithDetails: vi.fn(),
    } as unknown as VaultRepository;

    vaultService = new VaultService(mockVaultRepository);
  });

  describe('getVault', () => {
    it('should return Vault domain entity when vault exists', async () => {
      const vaultId = 'vault-123';
      const mockVaultData: VaultWithDetails = {
        vaultId,
        name: 'Test Vault',
        organizationId: 'org-456',
        workspaceId: 'ws-789',
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      vi.mocked(mockVaultRepository.findVaultWithDetails).mockResolvedValue(mockVaultData);

      const result = await vaultService.getVault(vaultId);

      expect(result).toBeInstanceOf(Vault);
      expect(result?.id).toBe(vaultId);
      expect(result?.name).toBe('Test Vault');
      expect(result?.organizationId).toBe('org-456');
      expect(result?.workspaceId).toBe('ws-789');
      expect(result?.createdAt).toEqual(new Date('2024-01-15T10:00:00Z'));
      expect(result?.addressCount).toBe(0);
    });

    it('should return null when vault does not exist', async () => {
      const vaultId = 'non-existent-vault';

      vi.mocked(mockVaultRepository.findVaultWithDetails).mockResolvedValue(null);

      const result = await vaultService.getVault(vaultId);

      expect(result).toBeNull();
      expect(mockVaultRepository.findVaultWithDetails).toHaveBeenCalledWith(vaultId);
    });

    it('should handle vault with null workspaceId', async () => {
      const vaultId = 'vault-no-workspace';
      const mockVaultData: VaultWithDetails = {
        vaultId,
        name: 'Vault Without Workspace',
        organizationId: 'org-456',
        workspaceId: null,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      vi.mocked(mockVaultRepository.findVaultWithDetails).mockResolvedValue(mockVaultData);

      const result = await vaultService.getVault(vaultId);

      expect(result).toBeInstanceOf(Vault);
      expect(result?.workspaceId).toBeNull();
    });

    it('should create an immutable Vault entity', async () => {
      const vaultId = 'vault-immutable';
      const mockVaultData: VaultWithDetails = {
        vaultId,
        name: 'Immutable Test',
        organizationId: 'org-456',
        workspaceId: 'ws-789',
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      vi.mocked(mockVaultRepository.findVaultWithDetails).mockResolvedValue(mockVaultData);

      const result = await vaultService.getVault(vaultId);

      expect(result).not.toBeNull();
      // Verify immutability - attempting to modify should throw in strict mode
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should call repository with correct vaultId', async () => {
      const vaultId = 'vault-specific-id';

      vi.mocked(mockVaultRepository.findVaultWithDetails).mockResolvedValue(null);

      await vaultService.getVault(vaultId);

      expect(mockVaultRepository.findVaultWithDetails).toHaveBeenCalledTimes(1);
      expect(mockVaultRepository.findVaultWithDetails).toHaveBeenCalledWith(vaultId);
    });
  });

  describe('getVaultDetails (existing method - backward compatibility)', () => {
    it('should continue to work as before', async () => {
      const vaultId = 'vault-123';
      const mockDetails = {
        vaultId,
        workspaceId: 'ws-789',
        organisationId: 'org-456',
      };

      vi.mocked(mockVaultRepository.findVaultDetails).mockResolvedValue(mockDetails);

      const result = await vaultService.getVaultDetails(vaultId);

      expect(result).toEqual(mockDetails);
      expect(mockVaultRepository.findVaultDetails).toHaveBeenCalledWith(vaultId);
    });

    it('should return null when vault not found', async () => {
      vi.mocked(mockVaultRepository.findVaultDetails).mockResolvedValue(null);

      const result = await vaultService.getVaultDetails('non-existent');

      expect(result).toBeNull();
    });
  });
});
