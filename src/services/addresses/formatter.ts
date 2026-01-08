import type { Addresses } from '@/src/types/address.js';

export const formatAddressFromDynamoDB = (
  address: Addresses.DynamoDBAddress | Addresses.LegacyDynamoDBAddress
): Addresses.Address => {
  // Determine if address is monitored based on SK
  // Legacy addresses (without #MONITORED or #UNMONITORED suffix) are treated as monitored
  const isMonitored =
    address.SK.endsWith('#MONITORED') ||
    (!address.SK.includes('#MONITORED') && !address.SK.includes('#UNMONITORED'));

  const baseAddress = {
    workspaceId: address.workspaceId,
    vaultId: address.vaultId,
    address: address.address,
    chainAlias: address.chain, // Map DynamoDB 'chain' field to API 'chainAlias'
    derivationPath: address.derivationPath ?? null,
    updatedAt: address.updatedAt,
    subscriptionId: 'subscriptionId' in address ? (address.subscriptionId ?? null) : null,
    tokens: address.tokens ?? [],
    monitored: isMonitored,
    // For legacy addresses without monitoredAt, use updatedAt as fallback
    monitoredAt: 'monitoredAt' in address ? address.monitoredAt : address.updatedAt,
    alias: address.alias ?? null,
    // DynamoDB addresses don't have lastReconciledBlock - only PostgreSQL does
    lastReconciledBlock: null,
  };

  // Add unmonitoredAt for unmonitored addresses
  if (!isMonitored && 'unmonitoredAt' in address) {
    return {
      ...baseAddress,
      unmonitoredAt: address.unmonitoredAt,
    };
  }

  return baseAddress;
};
