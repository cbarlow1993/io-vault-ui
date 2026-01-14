/**
 * Vault entity.
 * Represents a vault containing wallet addresses within an organization.
 */
import type { WalletAddress } from '@/src/domain/value-objects/index.js';

export interface CreateVaultData {
  id: string;
  organizationId: string;
  workspaceId?: string | null;
  createdAt: Date;
  addresses?: WalletAddress[];
}

export class Vault {
  private constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly workspaceId: string | null,
    public readonly createdAt: Date,
    public readonly addresses: readonly WalletAddress[]
  ) {
    Object.freeze(this);
  }

  static create(data: CreateVaultData): Vault {
    return new Vault(
      data.id,
      data.organizationId,
      data.workspaceId ?? null,
      data.createdAt,
      Object.freeze(data.addresses ?? [])
    );
  }

  addAddress(address: WalletAddress): Vault {
    return new Vault(
      this.id,
      this.organizationId,
      this.workspaceId,
      this.createdAt,
      Object.freeze([...this.addresses, address])
    );
  }

  hasAddress(address: WalletAddress): boolean {
    return this.addresses.some((a) => a.equals(address));
  }

  removeAddress(address: WalletAddress): Vault {
    return new Vault(
      this.id,
      this.organizationId,
      this.workspaceId,
      this.createdAt,
      Object.freeze(this.addresses.filter((a) => !a.equals(address)))
    );
  }

  get addressCount(): number {
    return this.addresses.length;
  }

  toJSON(): object {
    return {
      id: this.id,
      organizationId: this.organizationId,
      workspaceId: this.workspaceId,
      createdAt: this.createdAt.toISOString(),
      addressCount: this.addresses.length,
    };
  }
}
