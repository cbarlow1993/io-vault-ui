/**
 * Stubbed DynamoDB operations for addresses.
 * In standalone mode, use PostgreSQL repositories instead.
 */
import type { Addresses } from '../../types/address.js';
import type { HDAddressMetadata } from '../../types/hd-address.js';

const notImplemented = (fn: string) => {
  throw new Error(`${fn} is not available in standalone mode. Use PostgreSQL repositories instead.`);
};

export const getAddressItem = async (_opts: {
  PK: Addresses.PartitionKey;
  SK: Addresses.SortKey;
}): Promise<Addresses.DynamoDBAddress | null> => {
  notImplemented('getAddressItem');
  return null;
};

export const updateAddressItem = async (_opts: { address: Addresses.DynamoDBAddress }): Promise<void> => {
  notImplemented('updateAddressItem');
};

export const getHDMetadataItem = async (_opts: {
  PK: HDAddressMetadata.PartitionKey;
  SK: HDAddressMetadata.SortKey;
}): Promise<HDAddressMetadata.Metadata | null> => {
  notImplemented('getHDMetadataItem');
  return null;
};

export const putHDMetadataItem = async (_item: HDAddressMetadata.Metadata): Promise<void> => {
  notImplemented('putHDMetadataItem');
};

export const queryAddressesByPK = async (
  _pk: Addresses.PartitionKey
): Promise<Addresses.DynamoDBAddress[]> => {
  notImplemented('queryAddressesByPK');
  return [];
};

export const queryAddressesByOrgAndWorkspace = async (
  _gsi1pk: Addresses.GSI1PartitionKey,
  _gsi1skPrefix: string
): Promise<Addresses.DynamoDBAddress[]> => {
  notImplemented('queryAddressesByOrgAndWorkspace');
  return [];
};

export const queryByGSI2 = async (_opts: {
  gsi2pk: Addresses.GSI2PartitionKey;
}): Promise<Addresses.DynamoDBAddress[]> => {
  notImplemented('queryByGSI2');
  return [];
};

export const queryByGSI1 = async (_opts: {
  gsi1pk: Addresses.GSI1PartitionKey;
  gsi1skPrefix?: string;
  limit: number;
  exclusiveStartKey?: Record<string, unknown>;
  reverseSearch?: boolean;
}): Promise<{ items: Addresses.DynamoDBAddress[]; lastEvaluatedKey?: Record<string, unknown> }> => {
  notImplemented('queryByGSI1');
  return { items: [] };
};

export const queryByGSI3 = async (_opts: {
  gsi3pk: Addresses.GSI3PartitionKey;
  gsi3skPrefix?: string;
  limit: number;
  exclusiveStartKey?: Record<string, unknown>;
  reverseSearch?: boolean;
}): Promise<{ items: Addresses.DynamoDBAddress[]; lastEvaluatedKey?: Record<string, unknown> }> => {
  notImplemented('queryByGSI3');
  return { items: [] };
};

export const queryAddressesByVault = async (_opts: {
  gsi1pk: Addresses.GSI1PartitionKey;
  limit: number;
  exclusiveStartKey?: Record<string, unknown>;
  reverseSearch?: boolean;
}): Promise<{ items: Addresses.DynamoDBAddress[]; lastEvaluatedKey?: Record<string, unknown> }> => {
  notImplemented('queryAddressesByVault');
  return { items: [] };
};

export const queryAddressesByVaultAndChainPrefix = async (_opts: {
  gsi1pk: Addresses.GSI1PartitionKey;
  gsi1SKPrefix: string;
}): Promise<Addresses.DynamoDBAddress[]> => {
  notImplemented('queryAddressesByVaultAndChainPrefix');
  return [];
};

export const putAddressItem = async (_item: Addresses.DynamoDBAddress): Promise<void> => {
  notImplemented('putAddressItem');
};

export const deleteAddressItem = async (_item: Addresses.DynamoDBAddress): Promise<void> => {
  notImplemented('deleteAddressItem');
};

export const transactUnmonitorAddress = async (_opts: {
  monitoredItem: Addresses.MonitoredDynamoDBAddress;
  unmonitoredItem: Addresses.UnmonitoredDynamoDBAddress;
}): Promise<void> => {
  notImplemented('transactUnmonitorAddress');
};

export const transactRemonitorAddress = async (_opts: {
  unmonitoredItem: Addresses.UnmonitoredDynamoDBAddress;
  monitoredItem: Addresses.MonitoredDynamoDBAddress;
}): Promise<void> => {
  notImplemented('transactRemonitorAddress');
};

export const scanAllAddresses = async (_opts?: {
  limit?: number;
  exclusiveStartKey?: Record<string, unknown>;
}): Promise<{
  items: (Addresses.DynamoDBAddress | Addresses.LegacyDynamoDBAddress)[];
  lastEvaluatedKey?: Record<string, unknown>;
}> => {
  notImplemented('scanAllAddresses');
  return { items: [] };
};
