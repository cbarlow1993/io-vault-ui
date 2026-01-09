import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError } from '@iofinnet/errors-sdk';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { PostgresAddressService } from '@/src/services/addresses/postgres-service.js';
import type { AddressRepository, AddressWithDomain, CreateAddressInput } from '@/src/repositories/types.js';
import { InvalidAddressError, WalletAddress } from '@/src/domain/value-objects/index.js';

// Mock repository factory
function createMockAddressRepository(): AddressRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByAddressAndChainAlias: vi.fn(),
    findByVaultIdCursor: vi.fn(),
    findByVaultIdAndChainAliasCursor: vi.fn(),
    findHDAddressesByVaultIdAndChainAliasCursor: vi.fn(),
    findByVaultId: vi.fn(),
    findByVaultIdAndChainAlias: vi.fn(),
    findBySubscriptionId: vi.fn(),
    findMonitoredByVaultId: vi.fn(),
    findByOrganisationId: vi.fn(),
    setMonitored: vi.fn(),
    setUnmonitored: vi.fn(),
    updateAlias: vi.fn(),
    addToken: vi.fn(),
    removeToken: vi.fn(),
    findTokensByAddressId: vi.fn(),
    setTokenHidden: vi.fn(),
    setTokensHidden: vi.fn(),
    upsertTokens: vi.fn(),
    createMany: vi.fn(),
    deleteByVaultId: vi.fn(),
    findAllMonitored: vi.fn(),
    updateLastReconciledBlock: vi.fn(),
  } as unknown as AddressRepository;
}

// Mock address data factory
function createMockAddressWithDomain(overrides: Partial<AddressWithDomain> = {}): AddressWithDomain {
  const address = '0x742d35cc6634c0532925a3b844bc9e7595f5a123';
  const chainAlias = 'eth' as ChainAlias;
  return {
    id: 'addr-1',
    address,
    chain_alias: chainAlias,
    ecosystem: 'evm',
    vault_id: 'vault-1',
    workspace_id: 'workspace-1',
    organisation_id: 'org-1',
    derivation_path: null,
    alias: null,
    is_monitored: false,
    subscription_id: null,
    monitored_at: null,
    unmonitored_at: null,
    last_reconciled_block: null,
    created_at: new Date(),
    updated_at: new Date(),
    walletAddress: WalletAddress.fromNormalized(address, chainAlias),
    ...overrides,
  };
}

describe('PostgresAddressService', () => {
  let addressRepository: ReturnType<typeof createMockAddressRepository>;
  let service: PostgresAddressService;

  beforeEach(() => {
    vi.clearAllMocks();
    addressRepository = createMockAddressRepository();
    service = new PostgresAddressService({ addressRepository });
  });

  describe('getAddress - WalletAddress validation', () => {
    it('should normalize valid EVM address to lowercase before querying repository', async () => {
      const mixedCaseAddress = '0x742D35Cc6634C0532925A3b844Bc9e7595F5A123';
      const normalizedAddress = mixedCaseAddress.toLowerCase();

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(null);

      await service.getAddress({ chain: 'eth', address: mixedCaseAddress });

      expect(addressRepository.findByAddressAndChainAlias).toHaveBeenCalledWith(
        normalizedAddress,
        'eth'
      );
    });

    it('should throw InvalidAddressError for invalid EVM address format', async () => {
      const invalidAddress = 'not-a-valid-address';

      await expect(
        service.getAddress({ chain: 'eth', address: invalidAddress })
      ).rejects.toThrow(InvalidAddressError);

      expect(addressRepository.findByAddressAndChainAlias).not.toHaveBeenCalled();
    });

    it('should throw InvalidAddressError for EVM address without 0x prefix', async () => {
      const addressWithoutPrefix = '742d35cc6634c0532925a3b844bc9e7595f5a123';

      await expect(
        service.getAddress({ chain: 'eth', address: addressWithoutPrefix })
      ).rejects.toThrow(InvalidAddressError);

      expect(addressRepository.findByAddressAndChainAlias).not.toHaveBeenCalled();
    });

    it('should throw InvalidAddressError for empty address', async () => {
      await expect(
        service.getAddress({ chain: 'eth', address: '' })
      ).rejects.toThrow(InvalidAddressError);

      expect(addressRepository.findByAddressAndChainAlias).not.toHaveBeenCalled();
    });

    it('should return null when address not found in repository', async () => {
      const validAddress = '0x742d35cc6634c0532925a3b844bc9e7595f5a123';
      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(null);

      const result = await service.getAddress({ chain: 'eth', address: validAddress });

      expect(result).toBeNull();
    });

    it('should return formatted address when found in repository', async () => {
      const validAddress = '0x742d35cc6634c0532925a3b844bc9e7595f5a123';
      const mockAddress = createMockAddressWithDomain();

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(mockAddress);
      vi.mocked(addressRepository.findTokensByAddressId).mockResolvedValue([]);

      const result = await service.getAddress({ chain: 'eth', address: validAddress });

      expect(result).not.toBeNull();
      expect(result?.address).toBe(validAddress);
    });

    it('should validate Solana addresses correctly', async () => {
      const validSolanaAddress = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV8';

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(null);

      await service.getAddress({ chain: 'solana', address: validSolanaAddress });

      expect(addressRepository.findByAddressAndChainAlias).toHaveBeenCalledWith(
        validSolanaAddress.toLowerCase(),
        'solana'
      );
    });

    it('should throw InvalidAddressError for invalid Solana address', async () => {
      // Contains invalid base58 characters (0, O, I, l)
      const invalidSolanaAddress = '0OIl35Cc6634C0532925A3b844Bc9e7595F5A123abc';

      await expect(
        service.getAddress({ chain: 'solana', address: invalidSolanaAddress })
      ).rejects.toThrow(InvalidAddressError);

      expect(addressRepository.findByAddressAndChainAlias).not.toHaveBeenCalled();
    });
  });

  describe('updateAlias - WalletAddress validation', () => {
    it('should normalize address before querying repository', async () => {
      const mixedCaseAddress = '0x742D35Cc6634C0532925A3b844Bc9e7595F5A123';
      const normalizedAddress = mixedCaseAddress.toLowerCase();
      const mockAddress = createMockAddressWithDomain({ address: normalizedAddress });

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(mockAddress);
      vi.mocked(addressRepository.updateAlias).mockResolvedValue({ ...mockAddress, alias: 'My Wallet' });
      vi.mocked(addressRepository.findTokensByAddressId).mockResolvedValue([]);

      await service.updateAlias({ chain: 'eth', address: mixedCaseAddress, alias: 'My Wallet' });

      expect(addressRepository.findByAddressAndChainAlias).toHaveBeenCalledWith(
        normalizedAddress,
        'eth'
      );
    });

    it('should throw InvalidAddressError for invalid address', async () => {
      const invalidAddress = 'invalid';

      await expect(
        service.updateAlias({ chain: 'eth', address: invalidAddress, alias: 'Test' })
      ).rejects.toThrow(InvalidAddressError);

      expect(addressRepository.findByAddressAndChainAlias).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when address not found', async () => {
      const validAddress = '0x742d35cc6634c0532925a3b844bc9e7595f5a123';

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(null);

      await expect(
        service.updateAlias({ chain: 'eth', address: validAddress, alias: 'Test' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateAssetVisibility - WalletAddress validation', () => {
    it('should normalize address before querying repository', async () => {
      const mixedCaseAddress = '0x742D35Cc6634C0532925A3b844Bc9e7595F5A123';
      const normalizedAddress = mixedCaseAddress.toLowerCase();
      const mockAddress = createMockAddressWithDomain({ address: normalizedAddress });

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(mockAddress);
      vi.mocked(addressRepository.findTokensByAddressId).mockResolvedValue([]);

      await service.updateAssetVisibility({
        chain: 'eth',
        address: mixedCaseAddress,
        addToHiddenAssets: [],
        removeFromHiddenAssets: [],
      });

      expect(addressRepository.findByAddressAndChainAlias).toHaveBeenCalledWith(
        normalizedAddress,
        'eth'
      );
    });

    it('should throw InvalidAddressError for invalid address', async () => {
      await expect(
        service.updateAssetVisibility({
          chain: 'eth',
          address: 'invalid',
          addToHiddenAssets: [],
          removeFromHiddenAssets: [],
        })
      ).rejects.toThrow(InvalidAddressError);

      expect(addressRepository.findByAddressAndChainAlias).not.toHaveBeenCalled();
    });
  });

  describe('monitorAddress - WalletAddress validation', () => {
    it('should normalize address before querying repository', async () => {
      const mixedCaseAddress = '0x742D35Cc6634C0532925A3b844Bc9e7595F5A123';
      const normalizedAddress = mixedCaseAddress.toLowerCase();
      const mockAddress = createMockAddressWithDomain({ address: normalizedAddress });

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(mockAddress);
      vi.mocked(addressRepository.setMonitored).mockResolvedValue({
        ...mockAddress,
        is_monitored: true,
        subscription_id: 'sub-1',
      });

      await service.monitorAddress({
        chain: 'eth',
        address: mixedCaseAddress,
        subscriptionId: 'sub-1',
      });

      expect(addressRepository.findByAddressAndChainAlias).toHaveBeenCalledWith(
        normalizedAddress,
        'eth'
      );
    });

    it('should throw InvalidAddressError for invalid address', async () => {
      await expect(
        service.monitorAddress({ chain: 'eth', address: 'bad-address' })
      ).rejects.toThrow(InvalidAddressError);

      expect(addressRepository.findByAddressAndChainAlias).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when address not found', async () => {
      const validAddress = '0x742d35cc6634c0532925a3b844bc9e7595f5a123';

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(null);

      await expect(
        service.monitorAddress({ chain: 'eth', address: validAddress })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('unmonitorAddress - WalletAddress validation', () => {
    it('should normalize address before querying repository', async () => {
      const mixedCaseAddress = '0x742D35Cc6634C0532925A3b844Bc9e7595F5A123';
      const normalizedAddress = mixedCaseAddress.toLowerCase();
      const mockAddress = createMockAddressWithDomain({
        address: normalizedAddress,
        is_monitored: true,
      });

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(mockAddress);
      vi.mocked(addressRepository.setUnmonitored).mockResolvedValue({
        ...mockAddress,
        is_monitored: false,
      });
      vi.mocked(addressRepository.findTokensByAddressId).mockResolvedValue([]);

      await service.unmonitorAddress({ chain: 'eth', address: mixedCaseAddress });

      expect(addressRepository.findByAddressAndChainAlias).toHaveBeenCalledWith(
        normalizedAddress,
        'eth'
      );
    });

    it('should throw InvalidAddressError for invalid address', async () => {
      await expect(
        service.unmonitorAddress({ chain: 'eth', address: 'xyz' })
      ).rejects.toThrow(InvalidAddressError);

      expect(addressRepository.findByAddressAndChainAlias).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when address not found', async () => {
      const validAddress = '0x742d35cc6634c0532925a3b844bc9e7595f5a123';

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(null);

      await expect(
        service.unmonitorAddress({ chain: 'eth', address: validAddress })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateTokens - WalletAddress validation', () => {
    it('should normalize address before querying repository', async () => {
      const mixedCaseAddress = '0x742D35Cc6634C0532925A3b844Bc9e7595F5A123';
      const normalizedAddress = mixedCaseAddress.toLowerCase();
      const mockAddress = createMockAddressWithDomain({ address: normalizedAddress });

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(mockAddress);
      vi.mocked(addressRepository.upsertTokens).mockResolvedValue([]);
      vi.mocked(addressRepository.findTokensByAddressId).mockResolvedValue([]);

      await service.updateTokens({
        chain: 'eth',
        address: mixedCaseAddress,
        tokens: [{ contractAddress: '0xtoken123', symbol: 'TKN', decimals: 18 }],
      });

      expect(addressRepository.findByAddressAndChainAlias).toHaveBeenCalledWith(
        normalizedAddress,
        'eth'
      );
    });

    it('should throw InvalidAddressError for invalid address', async () => {
      await expect(
        service.updateTokens({
          chain: 'eth',
          address: 'not-valid',
          tokens: [],
        })
      ).rejects.toThrow(InvalidAddressError);

      expect(addressRepository.findByAddressAndChainAlias).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when address not found', async () => {
      const validAddress = '0x742d35cc6634c0532925a3b844bc9e7595f5a123';

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(null);

      await expect(
        service.updateTokens({
          chain: 'eth',
          address: validAddress,
          tokens: [],
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('chain-specific address validation', () => {
    it('should accept valid Bitcoin mainnet addresses', async () => {
      const btcAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(null);

      await service.getAddress({ chain: 'btc-mainnet', address: btcAddress });

      expect(addressRepository.findByAddressAndChainAlias).toHaveBeenCalledWith(
        btcAddress.toLowerCase(),
        'btc-mainnet'
      );
    });

    it('should throw InvalidAddressError for invalid Bitcoin address', async () => {
      const invalidBtcAddress = 'xyz-not-bitcoin';

      await expect(
        service.getAddress({ chain: 'btc-mainnet', address: invalidBtcAddress })
      ).rejects.toThrow(InvalidAddressError);

      expect(addressRepository.findByAddressAndChainAlias).not.toHaveBeenCalled();
    });

    it('should handle unknown chain types permissively', async () => {
      // For unknown chains, any non-empty address should be accepted
      const address = 'some-address-format';

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(null);

      await service.getAddress({ chain: 'unknown-chain' as ChainAlias, address });

      expect(addressRepository.findByAddressAndChainAlias).toHaveBeenCalledWith(
        address.toLowerCase(),
        'unknown-chain'
      );
    });
  });
});
