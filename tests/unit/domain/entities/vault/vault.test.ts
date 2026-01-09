import { describe, expect, it } from 'vitest';
import { Vault } from '@/src/domain/entities/index.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

describe('Vault', () => {
  const chainAlias = 'ethereum' as ChainAlias;

  const createTestAddress = (addr: string, chain: ChainAlias = chainAlias): WalletAddress => {
    return WalletAddress.create(addr, chain);
  };

  describe('create', () => {
    it('creates a Vault with all required fields', () => {
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        workspaceId: 'ws-789',
        createdAt,
      });

      expect(vault.id).toBe('vault-123');
      expect(vault.name).toBe('My Vault');
      expect(vault.organizationId).toBe('org-456');
      expect(vault.workspaceId).toBe('ws-789');
      expect(vault.createdAt).toEqual(createdAt);
      expect(vault.addresses).toEqual([]);
      expect(vault.addressCount).toBe(0);
    });

    it('defaults workspaceId to null when not provided', () => {
      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
      });

      expect(vault.workspaceId).toBeNull();
    });

    it('defaults addresses to empty array when not provided', () => {
      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
      });

      expect(vault.addresses).toEqual([]);
      expect(vault.addressCount).toBe(0);
    });

    it('creates a Vault with initial addresses', () => {
      const addr1 = createTestAddress('0x1234567890123456789012345678901234567890');
      const addr2 = createTestAddress('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');

      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
        addresses: [addr1, addr2],
      });

      expect(vault.addresses).toHaveLength(2);
      expect(vault.addressCount).toBe(2);
      expect(vault.hasAddress(addr1)).toBe(true);
      expect(vault.hasAddress(addr2)).toBe(true);
    });
  });

  describe('addAddress', () => {
    it('returns a new Vault with the address added', () => {
      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
      });

      const address = createTestAddress('0x1234567890123456789012345678901234567890');
      const updatedVault = vault.addAddress(address);

      expect(updatedVault.addresses).toHaveLength(1);
      expect(updatedVault.hasAddress(address)).toBe(true);
      expect(updatedVault.addressCount).toBe(1);
    });

    it('does not modify the original Vault (immutability)', () => {
      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
      });

      const address = createTestAddress('0x1234567890123456789012345678901234567890');
      const updatedVault = vault.addAddress(address);

      expect(vault.addresses).toHaveLength(0);
      expect(vault.addressCount).toBe(0);
      expect(updatedVault).not.toBe(vault);
    });

    it('preserves existing addresses when adding new one', () => {
      const addr1 = createTestAddress('0x1234567890123456789012345678901234567890');
      const addr2 = createTestAddress('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');

      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
        addresses: [addr1],
      });

      const updatedVault = vault.addAddress(addr2);

      expect(updatedVault.addresses).toHaveLength(2);
      expect(updatedVault.hasAddress(addr1)).toBe(true);
      expect(updatedVault.hasAddress(addr2)).toBe(true);
    });
  });

  describe('hasAddress', () => {
    it('returns true when vault contains the address', () => {
      const address = createTestAddress('0x1234567890123456789012345678901234567890');

      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
        addresses: [address],
      });

      expect(vault.hasAddress(address)).toBe(true);
    });

    it('returns false when vault does not contain the address', () => {
      const addr1 = createTestAddress('0x1234567890123456789012345678901234567890');
      const addr2 = createTestAddress('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');

      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
        addresses: [addr1],
      });

      expect(vault.hasAddress(addr2)).toBe(false);
    });

    it('returns false for empty vault', () => {
      const address = createTestAddress('0x1234567890123456789012345678901234567890');

      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
      });

      expect(vault.hasAddress(address)).toBe(false);
    });

    it('correctly identifies address using value equality', () => {
      const addr1 = createTestAddress('0x1234567890123456789012345678901234567890');
      // Create same address as different instance
      const addr2 = createTestAddress('0x1234567890123456789012345678901234567890');

      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
        addresses: [addr1],
      });

      expect(vault.hasAddress(addr2)).toBe(true);
    });
  });

  describe('removeAddress', () => {
    it('returns a new Vault without the specified address', () => {
      const addr1 = createTestAddress('0x1234567890123456789012345678901234567890');
      const addr2 = createTestAddress('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');

      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
        addresses: [addr1, addr2],
      });

      const updatedVault = vault.removeAddress(addr1);

      expect(updatedVault.addresses).toHaveLength(1);
      expect(updatedVault.hasAddress(addr1)).toBe(false);
      expect(updatedVault.hasAddress(addr2)).toBe(true);
    });

    it('does not modify the original Vault (immutability)', () => {
      const addr1 = createTestAddress('0x1234567890123456789012345678901234567890');

      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
        addresses: [addr1],
      });

      const updatedVault = vault.removeAddress(addr1);

      expect(vault.addresses).toHaveLength(1);
      expect(vault.hasAddress(addr1)).toBe(true);
      expect(updatedVault).not.toBe(vault);
    });

    it('returns unchanged Vault when address not found', () => {
      const addr1 = createTestAddress('0x1234567890123456789012345678901234567890');
      const addr2 = createTestAddress('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');

      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
        addresses: [addr1],
      });

      const updatedVault = vault.removeAddress(addr2);

      expect(updatedVault.addresses).toHaveLength(1);
      expect(updatedVault.hasAddress(addr1)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('serializes correctly with all fields', () => {
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const addr1 = createTestAddress('0x1234567890123456789012345678901234567890');

      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        workspaceId: 'ws-789',
        createdAt,
        addresses: [addr1],
      });

      const json = vault.toJSON();

      expect(json).toEqual({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        workspaceId: 'ws-789',
        createdAt: '2024-01-01T00:00:00.000Z',
        addressCount: 1,
      });
    });

    it('serializes correctly with null workspaceId', () => {
      const createdAt = new Date('2024-01-01T00:00:00Z');

      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt,
      });

      const json = vault.toJSON();

      expect(json).toEqual({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        workspaceId: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        addressCount: 0,
      });
    });
  });

  describe('immutability', () => {
    it('entity is frozen', () => {
      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
      });

      expect(Object.isFrozen(vault)).toBe(true);
    });

    it('addresses array is frozen', () => {
      const addr1 = createTestAddress('0x1234567890123456789012345678901234567890');

      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
        addresses: [addr1],
      });

      expect(Object.isFrozen(vault.addresses)).toBe(true);
    });
  });

  describe('addressCount', () => {
    it('returns correct count for empty vault', () => {
      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
      });

      expect(vault.addressCount).toBe(0);
    });

    it('returns correct count after adding addresses', () => {
      const addr1 = createTestAddress('0x1234567890123456789012345678901234567890');
      const addr2 = createTestAddress('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');

      const vault = Vault.create({
        id: 'vault-123',
        name: 'My Vault',
        organizationId: 'org-456',
        createdAt: new Date(),
      });

      const updated = vault.addAddress(addr1).addAddress(addr2);

      expect(updated.addressCount).toBe(2);
    });
  });
});
