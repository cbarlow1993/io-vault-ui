import { NotFoundError } from '@iofinnet/errors-sdk';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { AddressRepository, CreateAddressInput } from '@/src/repositories/types.js';
import type { Addresses } from '@/src/types/address.js';
import { formatAddressFromPostgres } from '@/src/services/addresses/postgres-formatter.js';
import { PAGINATION_DEFAULTS } from '@/src/lib/schemas/pagination-schema.js';

/**
 * Cursor-paginated result returned by address list methods.
 * @see docs/requirements/common/001-cursor-pagination.md
 */
export interface CursorPaginatedAddresses {
  items: Addresses.Address[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface AddressServiceDeps {
  addressRepository: AddressRepository;
}

export class PostgresAddressService {
  constructor(private deps: AddressServiceDeps) {}

  async getAddress({
    chain,
    address,
  }: {
    chain: string;
    address: string;
  }): Promise<Addresses.Address | null> {
    const result = await this.deps.addressRepository.findByAddressAndChainAlias(address, chain as ChainAlias);
    if (!result) {
      return null;
    }
    const tokens = await this.deps.addressRepository.findTokensByAddressId(result.id);
    return formatAddressFromPostgres(result, tokens);
  }

  async getAddressById(id: string): Promise<Addresses.Address | null> {
    const result = await this.deps.addressRepository.findById(id);
    if (!result) {
      return null;
    }
    const tokens = await this.deps.addressRepository.findTokensByAddressId(result.id);
    return formatAddressFromPostgres(result, tokens);
  }

  async getAddressBySubscriptionId(subscriptionId: string): Promise<Addresses.Address | null> {
    const results = await this.deps.addressRepository.findBySubscriptionId(subscriptionId);
    if (results.length === 0) {
      return null;
    }
    const result = results[0]!;
    const tokens = await this.deps.addressRepository.findTokensByAddressId(result.id);
    return formatAddressFromPostgres(result, tokens);
  }

  /**
   * Get all addresses for a vault with cursor-based pagination.
   * @see docs/requirements/api-addresses/002-list-vault-addresses.md
   */
  async getAllForVault({
    vaultId,
    limit = PAGINATION_DEFAULTS.DEFAULT_LIMIT,
    cursor,
    monitored,
  }: {
    vaultId: string;
    limit?: number;
    cursor?: string;
    monitored?: boolean;
  }): Promise<CursorPaginatedAddresses> {
    const result = await this.deps.addressRepository.findByVaultIdCursor(vaultId, {
      limit,
      cursor,
      monitored,
    });

    const items = await Promise.all(
      result.data.map(async (addr) => {
        const tokens = await this.deps.addressRepository.findTokensByAddressId(addr.id);
        return formatAddressFromPostgres(addr, tokens);
      })
    );

    return {
      items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      total: result.total,
    };
  }

  /**
   * Get all addresses for a vault and chain with cursor-based pagination.
   * @see docs/requirements/api-addresses/003-list-chain-addresses.md
   */
  async getAllForVaultAndChain({
    vaultId,
    chain,
    limit = PAGINATION_DEFAULTS.DEFAULT_LIMIT,
    cursor,
    monitored,
  }: {
    vaultId: string;
    chain: string;
    limit?: number;
    cursor?: string;
    monitored?: boolean;
  }): Promise<CursorPaginatedAddresses> {
    const result = await this.deps.addressRepository.findByVaultIdAndChainAliasCursor(vaultId, chain as ChainAlias, {
      limit,
      cursor,
      monitored,
    });

    const items = await Promise.all(
      result.data.map(async (addr) => {
        const tokens = await this.deps.addressRepository.findTokensByAddressId(addr.id);
        return formatAddressFromPostgres(addr, tokens);
      })
    );

    return {
      items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      total: result.total,
    };
  }

  /**
   * Get HD addresses for a vault and chain with cursor-based pagination.
   * @see docs/requirements/api-addresses/007-list-hd-addresses.md
   */
  async getHDAddressesForVaultAndChain({
    vaultId,
    chain,
    limit = PAGINATION_DEFAULTS.DEFAULT_LIMIT,
    cursor,
  }: {
    vaultId: string;
    chain: string;
    limit?: number;
    cursor?: string;
  }): Promise<CursorPaginatedAddresses> {
    const result = await this.deps.addressRepository.findHDAddressesByVaultIdAndChainAliasCursor(
      vaultId,
      chain as ChainAlias,
      { limit, cursor }
    );

    const items = await Promise.all(
      result.data.map(async (addr) => {
        const tokens = await this.deps.addressRepository.findTokensByAddressId(addr.id);
        return formatAddressFromPostgres(addr, tokens);
      })
    );

    return {
      items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      total: result.total,
    };
  }

  async createAddress({
    input,
    monitored = false,
  }: {
    input: CreateAddressInput;
    monitored?: boolean;
  }): Promise<Addresses.Address> {
    const address = await this.deps.addressRepository.create(input);

    if (monitored) {
      // Set monitored without a subscription ID
      const monitoredAddress = await this.deps.addressRepository.setMonitored(address.id, '');
      return formatAddressFromPostgres(monitoredAddress, []);
    }

    return formatAddressFromPostgres(address, []);
  }

  async updateAlias({
    chain,
    address,
    alias,
  }: {
    chain: string;
    address: string;
    alias: string | null;
  }): Promise<Addresses.Address> {
    const existing = await this.deps.addressRepository.findByAddressAndChainAlias(address, chain as ChainAlias);
    if (!existing) {
      throw new NotFoundError(`Address not found for address ${address} and chain ${chain}`);
    }

    const updated = await this.deps.addressRepository.updateAlias(existing.id, alias);
    const tokens = await this.deps.addressRepository.findTokensByAddressId(updated.id);
    return formatAddressFromPostgres(updated, tokens);
  }

  async updateAssetVisibility({
    chain,
    address,
    addToHiddenAssets,
    removeFromHiddenAssets,
  }: {
    chain: string;
    address: string;
    addToHiddenAssets: string[];
    removeFromHiddenAssets: string[];
  }): Promise<Addresses.Address> {
    const existing = await this.deps.addressRepository.findByAddressAndChainAlias(address, chain as ChainAlias);
    if (!existing) {
      throw new NotFoundError(`Address not found for address ${address} and chain ${chain}`);
    }

    if (addToHiddenAssets.length > 0) {
      await this.deps.addressRepository.setTokensHidden(existing.id, addToHiddenAssets, true);
    }

    if (removeFromHiddenAssets.length > 0) {
      await this.deps.addressRepository.setTokensHidden(existing.id, removeFromHiddenAssets, false);
    }

    const tokens = await this.deps.addressRepository.findTokensByAddressId(existing.id);
    return formatAddressFromPostgres(existing, tokens);
  }

  async monitorAddress({
    chain,
    address,
    subscriptionId = '',
  }: {
    chain: string;
    address: string;
    subscriptionId?: string;
  }): Promise<Addresses.Address> {
    const existing = await this.deps.addressRepository.findByAddressAndChainAlias(address, chain as ChainAlias);
    if (!existing) {
      throw new NotFoundError(`Address not found for address ${address} and chain ${chain}`);
    }

    const monitored = await this.deps.addressRepository.setMonitored(existing.id, subscriptionId);
    return formatAddressFromPostgres(monitored);
  }

  async unmonitorAddress({
    chain,
    address,
  }: {
    chain: string;
    address: string;
  }): Promise<Addresses.Address> {
    const existing = await this.deps.addressRepository.findByAddressAndChainAlias(address, chain as ChainAlias);
    if (!existing) {
      throw new NotFoundError(`Address not found for address ${address} and chain ${chain}`);
    }

    const unmonitored = await this.deps.addressRepository.setUnmonitored(existing.id);
    const tokens = await this.deps.addressRepository.findTokensByAddressId(unmonitored.id);
    return formatAddressFromPostgres(unmonitored, tokens);
  }

  async updateTokens({
    chain,
    address,
    tokens,
  }: {
    chain: string;
    address: string;
    tokens: Array<{
      contractAddress: string;
      symbol?: string;
      decimals?: number;
      name?: string;
    }>;
  }): Promise<Addresses.Address> {
    const existing = await this.deps.addressRepository.findByAddressAndChainAlias(address, chain as ChainAlias);
    if (!existing) {
      throw new NotFoundError(`Address not found for address ${address} and chain ${chain}`);
    }

    await this.deps.addressRepository.upsertTokens(existing.id, tokens);
    const updatedTokens = await this.deps.addressRepository.findTokensByAddressId(existing.id);
    return formatAddressFromPostgres(existing, updatedTokens);
  }

  async deleteByVaultId(vaultId: string): Promise<number> {
    return this.deps.addressRepository.deleteByVaultId(vaultId);
  }
}
