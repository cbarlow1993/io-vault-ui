/**
 * Stubbed DynamoDB operations for token metadata.
 * In standalone mode, use PostgreSQL repositories instead.
 */
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { TokenMetadata } from '../../../types/token-metadata.js';

const notImplemented = (fn: string) => {
  throw new Error(`${fn} is not available in standalone mode. Use PostgreSQL repositories instead.`);
};

export const getTokenMetadataItem = async (_opts: {
  chain: ChainAlias;
  address: string;
}): Promise<TokenMetadata.DynamoDBTokenMetadata | null> => {
  notImplemented('getTokenMetadataItem');
  return null;
};

export const putTokenMetadataItem = async (_item: TokenMetadata.DynamoDBTokenMetadata): Promise<void> => {
  notImplemented('putTokenMetadataItem');
};

export const listTokenMetadataItems = async (_chain: ChainAlias): Promise<TokenMetadata.DynamoDBTokenMetadata[]> => {
  notImplemented('listTokenMetadataItems');
  return [];
};

export const batchGetTokenMetadataItems = async (
  _chain: ChainAlias,
  _addresses: string[]
): Promise<TokenMetadata.DynamoDBTokenMetadata[]> => {
  notImplemented('batchGetTokenMetadataItems');
  return [];
};
