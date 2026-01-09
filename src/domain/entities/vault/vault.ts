/**
 * Vault entity.
 * Represents a vault containing wallet addresses within an organization.
 */
import type { WalletAddress } from '@/src/domain/value-objects/index.js';

export interface CreateVaultData {
  id: string;
  name: string;
  organizationId: string;
  workspaceId?: string | null;
  createdAt: Date;
  addresses?: WalletAddress[];
}

/**
 * Vault entity representing a collection of wallet addresses.
 *
 * @example
 * const vault = Vault.create({
 *   id: 'vault-123',
 *   name: 'Main Vault',
 *   organizationId: 'org-456',
 *   workspaceId: 'ws-789',
 *   createdAt: new Date(),
 * });
 *
 * const addr = WalletAddress.create('0x...', 'ethereum');
 * const updatedVault = vault.addAddress(addr);
 * updatedVault.hasAddress(addr); // true
 */
export class Vault {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly organizationId: string,
    public readonly workspaceId: string | null,
    public readonly createdAt: Date,
    public readonly addresses: readonly WalletAddress[]
  ) {
    Object.freeze(this);
  }

  /**
   * Create a new Vault entity
   */
  static create(data: CreateVaultData): Vault {
    return new Vault(
      data.id,
      data.name,
      data.organizationId,
      data.workspaceId ?? null,
      data.createdAt,
      Object.freeze(data.addresses ?? [])
    );
  }

  /**
   * Add an address to the vault (returns new immutable Vault)
   */
  addAddress(address: WalletAddress): Vault {
    return new Vault(
      this.id,
      this.name,
      this.organizationId,
      this.workspaceId,
      this.createdAt,
      Object.freeze([...this.addresses, address])
    );
  }

  /**
   * Check if the vault contains a specific address
   */
  hasAddress(address: WalletAddress): boolean {
    return this.addresses.some((a) => a.equals(address));
  }

  /**
   * Remove an address from the vault (returns new immutable Vault)
   */
  removeAddress(address: WalletAddress): Vault {
    return new Vault(
      this.id,
      this.name,
      this.organizationId,
      this.workspaceId,
      this.createdAt,
      Object.freeze(this.addresses.filter((a) => !a.equals(address)))
    );
  }

  /**
   * Get the number of addresses in the vault
   */
  get addressCount(): number {
    return this.addresses.length;
  }

  /**
   * Serialize the vault for API responses or storage
   */
  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      organizationId: this.organizationId,
      workspaceId: this.workspaceId,
      createdAt: this.createdAt.toISOString(),
      addressCount: this.addresses.length,
    };
  }
}
