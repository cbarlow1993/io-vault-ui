import type { Address, AddressToken } from '@/src/lib/database/types.js';
import type { Addresses } from '@/src/types/address.js';
import type { AddressListItem } from '@/src/routes/addresses/schemas.js';

/**
 * Formats a PostgreSQL Address entity for list responses (excludes tokens for performance)
 */
export function formatAddressForList(address: Address): AddressListItem {
  return {
    id: address.id,
    address: address.address,
    chainAlias: address.chain_alias,
    vaultId: address.vault_id,
    workspaceId: address.workspace_id,
    derivationPath: address.derivation_path ?? null,
    subscriptionId: address.subscription_id ?? null,
    monitored: address.is_monitored,
    monitoredAt: address.monitored_at?.toISOString(),
    unmonitoredAt: address.unmonitored_at?.toISOString(),
    updatedAt: address.updated_at.toISOString(),
    alias: address.alias ?? null,
    lastReconciledBlock: address.last_reconciled_block !== null && address.last_reconciled_block !== undefined
      ? Number(address.last_reconciled_block)
      : null,
  };
}

/**
 * Formats a PostgreSQL Address entity to the API response format (includes tokens)
 */
export function formatAddressFromPostgres(
  address: Address,
  tokens: AddressToken[] = []
): Addresses.Address {
  return {
    id: address.id,
    address: address.address,
    chainAlias: address.chain_alias,
    vaultId: address.vault_id,
    workspaceId: address.workspace_id,
    derivationPath: address.derivation_path ?? null,
    subscriptionId: address.subscription_id ?? null,
    monitored: address.is_monitored,
    monitoredAt: address.monitored_at?.toISOString(),
    unmonitoredAt: address.unmonitored_at?.toISOString(),
    updatedAt: address.updated_at.toISOString(),
    tokens: tokens.map(formatTokenFromPostgres),
    alias: address.alias ?? null,
    lastReconciledBlock: address.last_reconciled_block !== null && address.last_reconciled_block !== undefined
      ? Number(address.last_reconciled_block)
      : null,
  };
}

/**
 * Formats a PostgreSQL AddressToken entity to the API response format
 */
export function formatTokenFromPostgres(token: AddressToken): Addresses.Token {
  return {
    contractAddress: token.contract_address,
    symbol: token.symbol ?? '',
    decimals: token.decimals ?? undefined,
    hidden: token.hidden,
  };
}
