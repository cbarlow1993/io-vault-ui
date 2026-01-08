import { NotFoundError } from '@iofinnet/errors-sdk';
import { formatAddressFromDynamoDB } from '../../services/addresses/formatter';
import { AddressKeys, hdMetadataKeys, Status } from '../../services/addresses/keys';
import type { Addresses } from '../../types/address';
import type { HDAddressMetadata } from '../../types/hd-address';
import {
  deleteAddressItem,
  getAddressItem,
  getHDMetadataItem,
  putAddressItem,
  putHDMetadataItem,
  queryAddressesByPK,
  queryAddressesByVault,
  queryByGSI1,
  queryByGSI2,
  queryByGSI3,
  transactRemonitorAddress,
  transactUnmonitorAddress,
  updateAddressItem,
} from './ddb';

// Re-export Address class for validation utilities
export { Address } from './address';

// Re-export pipeline triggers
export { startPipelines } from './pipelines';

export const getAddress = async ({
  chain,
  address,
}: {
  chain: string;
  address: string;
}): Promise<Addresses.Address | null> => {
  const item = await getAddressItem({
    PK: AddressKeys.pk(address),
    SK: AddressKeys.sk(chain),
  });
  return item ? formatAddressFromDynamoDB(item) : null;
};

export const getAddressBySubscriptionId = async ({
  subscriptionId,
}: {
  subscriptionId: string;
}): Promise<Addresses.Address | null> => {
  const items = await queryByGSI2({
    gsi2pk: AddressKeys.gsi2pk(subscriptionId),
  });

  return items && items.length > 0 ? formatAddressFromDynamoDB(items[0]) : null;
};

export const updateAddressTokens = async ({
  chain,
  address,
  tokens,
}: {
  chain: string;
  address: string;
  tokens: Addresses.Token[];
}) => {
  const item = await getAddressItem({
    PK: AddressKeys.pk(address),
    SK: AddressKeys.sk(chain),
  });

  if (!item) {
    throw new NotFoundError(`Address not found for address ${address} and chain ${chain}`);
  }

  const existingTokens = item.tokens ?? [];

  const updatedTokens = [
    ...existingTokens,
    ...tokens
      .filter(
        (token) =>
          !existingTokens.some(
            (t) => t.contractAddress.toLowerCase() === token.contractAddress.toLowerCase()
          )
      )
      .map((token) => ({ ...token, hidden: false })),
  ];

  const updatedItem = {
    ...item,
    tokens: updatedTokens,
  };

  await updateAddressItem({ address: updatedItem });

  return formatAddressFromDynamoDB(updatedItem);
};

export const updateAddressAssetVisibility = async ({
  chain,
  address,
  addToHiddenAssets,
  removeFromHiddenAssets,
}: {
  chain: string;
  address: string;
  addToHiddenAssets: string[];
  removeFromHiddenAssets: string[];
}): Promise<Addresses.Address | null> => {
  const item = await getAddressItem({
    PK: AddressKeys.pk(address),
    SK: AddressKeys.sk(chain),
  });

  if (!item) {
    throw new NotFoundError(`Address not found for address ${address} and chain ${chain}`);
  }

  const updatedTokens = item.tokens.map((token) => {
    const shouldBeHidden = addToHiddenAssets.includes(token.contractAddress);
    const shouldBeVisible = removeFromHiddenAssets.includes(token.contractAddress);

    if (shouldBeHidden) {
      return { ...token, hidden: true };
    } else if (shouldBeVisible) {
      return { ...token, hidden: false };
    }

    return token;
  });

  const updatedItem = {
    ...item,
    tokens: updatedTokens,
  };

  await updateAddressItem({ address: updatedItem });

  return formatAddressFromDynamoDB(updatedItem);
};

export const updateAddressAlias = async ({
  chain,
  address,
  alias,
}: {
  chain: string;
  address: string;
  alias: string | null | undefined;
}): Promise<Addresses.Address | null> => {
  const item = await getAddressItem({
    PK: AddressKeys.pk(address),
    SK: AddressKeys.sk(chain),
  });

  if (!item) {
    throw new NotFoundError(`Address not found for address ${address} and chain ${chain}`);
  }

  const updatedItem = {
    ...item,
    alias: alias ?? null,
  };

  await updateAddressItem({ address: updatedItem });

  return formatAddressFromDynamoDB(updatedItem);
};

export const getAllForVault = async ({
  vaultId,
  limit,
  exclusiveStartKey,
  reverseSearch,
  monitored,
}: {
  vaultId: string;
  limit: number;
  exclusiveStartKey?: Record<string, unknown>;
  reverseSearch?: boolean;
  monitored?: boolean;
}): Promise<{ items: Addresses.Address[]; lastEvaluatedKey?: Record<string, unknown> }> => {
  // If monitored filter is specified, use GSI3; otherwise use GSI1 (returns both)
  if (monitored !== undefined) {
    const gsi3pk = AddressKeys.gsi3pk(vaultId);
    const gsi3skPrefix = monitored ? 'MONITORED#' : 'UNMONITORED#';
    const results = await queryByGSI3({
      gsi3pk,
      gsi3skPrefix,
      limit,
      exclusiveStartKey,
      reverseSearch,
    });
    const items = results.items.map(formatAddressFromDynamoDB);
    return { items, lastEvaluatedKey: results.lastEvaluatedKey };
  }

  // Default: return both monitored and unmonitored
  const gsi1pk = AddressKeys.gsi1pk(vaultId);
  const results = await queryAddressesByVault({ gsi1pk, limit, exclusiveStartKey, reverseSearch });
  const items = results.items.map(formatAddressFromDynamoDB);
  return { items, lastEvaluatedKey: results.lastEvaluatedKey };
};

export const getAllForVaultAndChain = async ({
  vaultId,
  chain,
  limit,
  exclusiveStartKey,
  reverseSearch,
  monitored,
}: {
  vaultId: string;
  chain: string;
  limit: number;
  exclusiveStartKey?: Record<string, unknown>;
  reverseSearch?: boolean;
  monitored?: boolean;
}): Promise<{ items: Addresses.Address[]; lastEvaluatedKey?: Record<string, unknown> }> => {
  // If monitored filter is specified, use GSI3; otherwise use GSI1 (returns both)
  if (monitored !== undefined) {
    const gsi3pk = AddressKeys.gsi3pk(vaultId);
    const gsi3skPrefix = monitored ? `MONITORED#CHAIN#${chain}#` : `UNMONITORED#CHAIN#${chain}#`;
    const results = await queryByGSI3({
      gsi3pk,
      gsi3skPrefix,
      limit,
      exclusiveStartKey,
      reverseSearch,
    });
    const items = results.items.map(formatAddressFromDynamoDB);
    return { items, lastEvaluatedKey: results.lastEvaluatedKey };
  }

  // Default: return both monitored and unmonitored
  const gsi1pk = AddressKeys.gsi1pk(vaultId);
  const gsi1skPrefix = AddressKeys.gsi1sk.beginsWithChain(chain);
  const results = await queryByGSI1({
    gsi1pk,
    gsi1skPrefix,
    limit,
    exclusiveStartKey,
    reverseSearch,
  });
  const items = results.items.map(formatAddressFromDynamoDB);
  return { items, lastEvaluatedKey: results.lastEvaluatedKey };
};

export const getRootAddressesForVaultChain = async ({
  vaultId,
  chain,
  limit,
  exclusiveStartKey,
  reverseSearch,
  monitored,
}: {
  vaultId: string;
  chain: string;
  limit: number;
  exclusiveStartKey?: Record<string, unknown>;
  reverseSearch?: boolean;
  monitored?: boolean;
}): Promise<{ items: Addresses.Address[]; lastEvaluatedKey?: Record<string, unknown> }> => {
  // If monitored filter is specified, use GSI3; otherwise use GSI1 (returns both)
  if (monitored !== undefined) {
    const gsi3pk = AddressKeys.gsi3pk(vaultId);
    const gsi3skPrefix = monitored
      ? `MONITORED#CHAIN#${chain}#ROOT#`
      : `UNMONITORED#CHAIN#${chain}#ROOT#`;
    const results = await queryByGSI3({
      gsi3pk,
      gsi3skPrefix,
      limit,
      exclusiveStartKey,
      reverseSearch,
    });
    const items = results.items.map(formatAddressFromDynamoDB);
    return { items, lastEvaluatedKey: results.lastEvaluatedKey };
  }

  // Default: return both monitored and unmonitored
  const gsi1pk = AddressKeys.gsi1pk(vaultId);
  const gsi1skPrefix = AddressKeys.gsi1sk.rootPrefix(chain);
  const results = await queryByGSI1({
    gsi1pk,
    gsi1skPrefix,
    limit,
    exclusiveStartKey,
    reverseSearch,
  });
  const items = results.items.map(formatAddressFromDynamoDB);
  return { items, lastEvaluatedKey: results.lastEvaluatedKey };
};

export const getChildAddressesForVaultChain = async ({
  vaultId,
  chain,
  limit,
  exclusiveStartKey,
  reverseSearch,
  monitored,
}: {
  vaultId: string;
  chain: string;
  limit: number;
  exclusiveStartKey?: Record<string, unknown>;
  reverseSearch?: boolean;
  monitored?: boolean;
}): Promise<{ items: Addresses.Address[]; lastEvaluatedKey?: Record<string, unknown> }> => {
  // If monitored filter is specified, use GSI3; otherwise use GSI1 (returns both)
  if (monitored !== undefined) {
    const gsi3pk = AddressKeys.gsi3pk(vaultId);
    const gsi3skPrefix = monitored
      ? `MONITORED#CHAIN#${chain}#CHILD#`
      : `UNMONITORED#CHAIN#${chain}#CHILD#`;
    const results = await queryByGSI3({
      gsi3pk,
      gsi3skPrefix,
      limit,
      exclusiveStartKey,
      reverseSearch,
    });
    const items = results.items.map(formatAddressFromDynamoDB);
    return { items, lastEvaluatedKey: results.lastEvaluatedKey };
  }

  // Default: return both monitored and unmonitored
  const gsi1pk = AddressKeys.gsi1pk(vaultId);
  const gsi1skPrefix = AddressKeys.gsi1sk.childPrefix(chain);
  const results = await queryByGSI1({
    gsi1pk,
    gsi1skPrefix,
    limit,
    exclusiveStartKey,
    reverseSearch,
  });
  const items = results.items.map(formatAddressFromDynamoDB);
  return { items, lastEvaluatedKey: results.lastEvaluatedKey };
};

export const createAddress = async ({
  input,
  monitored = Status.MONITORED,
}: {
  input: Addresses.CreateAddressInput;
  monitored?: Status;
}): Promise<Addresses.Address> => {
  const now = new Date().toISOString();
  const isChild = !!input.derivationPath;
  const isMonitored = monitored === Status.MONITORED;

  // Build base item with common fields
  const baseItem = {
    PK: AddressKeys.pk(input.address),
    SK: AddressKeys.sk(input.chain, monitored),
    address: input.address,
    chain: input.chain,
    ecosystem: input.ecosystem,
    organisationId: input.organisationId,
    vaultId: input.vaultId,
    workspaceId: input.workspaceId,
    monitoredAt: now,
    updatedAt: now,
    tokens: [],
    GSI1PK: AddressKeys.gsi1pk(input.vaultId),
    GSI1SK: isChild
      ? AddressKeys.gsi1sk.child(input.chain, input.address, input.derivationPath ?? '')
      : AddressKeys.gsi1sk.root(input.chain, input.address),
    GSI3PK: AddressKeys.gsi3pk(input.vaultId),
    GSI3SK: isChild
      ? AddressKeys.gsi3sk.child(
          input.chain,
          input.address,
          input.derivationPath ?? '',
          isMonitored
        )
      : AddressKeys.gsi3sk.root(input.chain, input.address, isMonitored),
    ...(isChild ? { derivationPath: input.derivationPath } : {}),
    ...(input.ttl ? { ttl: input.ttl } : {}),
    ...(input.alias ? { alias: input.alias } : {}),
  };

  // Add conditional fields based on monitored status
  const item = isMonitored
    ? (baseItem as Addresses.MonitoredDynamoDBAddress)
    : ({
        ...baseItem,
        unmonitoredAt: now,
      } as Addresses.UnmonitoredDynamoDBAddress);

  await putAddressItem(item);
  return formatAddressFromDynamoDB(item);
};

export const getNextHDAddressIndex = async (vaultId: string, chain: string): Promise<number> => {
  const PK = hdMetadataKeys.pk(vaultId);
  const SK = hdMetadataKeys.sk(chain);

  const item = await getHDMetadataItem({ PK, SK });

  if (!item) {
    return 0;
  }
  return item.lastHDAddressIndex + 1;
};

export const updateHDMetadata = async (
  vaultId: string,
  chain: string,
  lastHDAddressIndex: number
): Promise<void> => {
  const PK = hdMetadataKeys.pk(vaultId);
  const SK = hdMetadataKeys.sk(chain);

  const item = <HDAddressMetadata.Metadata>{
    PK,
    SK,
    vaultId,
    chain,
    lastHDAddressIndex,
  };

  await putHDMetadataItem(item);
};

export const getVaultIdByAddress = async (address: string): Promise<string> => {
  const addresses = await queryAddressesByPK(AddressKeys.pk(address));
  if (addresses.length === 0) {
    throw new NotFoundError(`Address not found for address ${address}`);
  }
  return addresses[0].vaultId;
};

export const deleteAddress = async ({
  address,
  chain,
}: {
  address: string;
  chain: string;
}): Promise<void> => {
  const item = await getAddressItem({
    PK: AddressKeys.pk(address),
    SK: AddressKeys.sk(chain, Status.MONITORED),
  });

  if (!item) {
    throw new NotFoundError(`Address not found for address ${address} and chain ${chain}`);
  }

  await deleteAddressItem(item);
};

export const unmonitorAddress = async ({
  address,
  chain,
}: {
  address: string;
  chain: string;
}): Promise<Addresses.Address> => {
  const monitoredItem = await getAddressItem({
    PK: AddressKeys.pk(address),
    SK: AddressKeys.sk(chain, Status.MONITORED),
  });

  if (!monitoredItem) {
    throw new NotFoundError(
      `Monitored address not found for address ${address} and chain ${chain}`
    );
  }

  const now = new Date().toISOString();
  const isChild = !!monitoredItem.derivationPath;

  const unmonitoredItem = <Addresses.UnmonitoredDynamoDBAddress>{
    PK: AddressKeys.pk(address),
    SK: AddressKeys.sk(chain, Status.UNMONITORED),
    address: monitoredItem.address,
    chain: monitoredItem.chain,
    ecosystem: monitoredItem.ecosystem,
    organisationId: monitoredItem.organisationId,
    vaultId: monitoredItem.vaultId,
    workspaceId: monitoredItem.workspaceId,
    monitoredAt: monitoredItem.monitoredAt,
    unmonitoredAt: now,
    updatedAt: now,
    tokens: monitoredItem.tokens ?? [],
    GSI1PK: AddressKeys.gsi1pk(monitoredItem.vaultId),
    GSI1SK: isChild
      ? AddressKeys.gsi1sk.child(chain, address, monitoredItem.derivationPath ?? '')
      : AddressKeys.gsi1sk.root(chain, address),
    GSI3PK: AddressKeys.gsi3pk(monitoredItem.vaultId),
    GSI3SK: isChild
      ? AddressKeys.gsi3sk.child(chain, address, monitoredItem.derivationPath ?? '', false)
      : AddressKeys.gsi3sk.root(chain, address, false),
    ...(isChild ? { derivationPath: monitoredItem.derivationPath } : {}),
    ...(monitoredItem.ttl ? { ttl: monitoredItem.ttl } : {}),
    ...(monitoredItem.alias ? { alias: monitoredItem.alias } : {}),
  };

  // Use transactional write to atomically delete monitored item and create unmonitored item
  await transactUnmonitorAddress({
    monitoredItem: monitoredItem as Addresses.MonitoredDynamoDBAddress,
    unmonitoredItem,
  });

  return formatAddressFromDynamoDB(unmonitoredItem);
};

export const remonitorAddress = async ({
  address,
  chain,
}: {
  address: string;
  chain: string;
}): Promise<Addresses.Address> => {
  const unmonitoredItem = await getAddressItem({
    PK: AddressKeys.pk(address),
    SK: AddressKeys.sk(chain, Status.UNMONITORED),
  });

  if (!unmonitoredItem) {
    throw new NotFoundError(
      `Unmonitored address not found for address ${address} and chain ${chain}`
    );
  }

  // Create monitored item, preserving all existing fields
  const now = new Date().toISOString();
  const isChild = !!unmonitoredItem.derivationPath;

  const monitoredItem = <Addresses.MonitoredDynamoDBAddress>{
    PK: AddressKeys.pk(address),
    SK: AddressKeys.sk(chain, Status.MONITORED),
    address: unmonitoredItem.address,
    chain: unmonitoredItem.chain,
    ecosystem: unmonitoredItem.ecosystem,
    organisationId: unmonitoredItem.organisationId,
    vaultId: unmonitoredItem.vaultId,
    workspaceId: unmonitoredItem.workspaceId,
    monitoredAt: unmonitoredItem.monitoredAt, // Preserve original monitored timestamp
    updatedAt: now,
    tokens: unmonitoredItem.tokens ?? [],
    GSI1PK: AddressKeys.gsi1pk(unmonitoredItem.vaultId),
    GSI1SK: isChild
      ? AddressKeys.gsi1sk.child(chain, address, unmonitoredItem.derivationPath ?? '')
      : AddressKeys.gsi1sk.root(chain, address),
    GSI3PK: AddressKeys.gsi3pk(unmonitoredItem.vaultId),
    GSI3SK: isChild
      ? AddressKeys.gsi3sk.child(chain, address, unmonitoredItem.derivationPath ?? '', true)
      : AddressKeys.gsi3sk.root(chain, address, true),
    ...(isChild ? { derivationPath: unmonitoredItem.derivationPath } : {}),
    ...(unmonitoredItem.ttl ? { ttl: unmonitoredItem.ttl } : {}),
    ...(unmonitoredItem.alias ? { alias: unmonitoredItem.alias } : {}),
  };

  // Use transactional write to atomically delete unmonitored item and create monitored item
  await transactRemonitorAddress({
    unmonitoredItem: unmonitoredItem as Addresses.UnmonitoredDynamoDBAddress,
    monitoredItem,
  });

  return formatAddressFromDynamoDB(monitoredItem);
};
