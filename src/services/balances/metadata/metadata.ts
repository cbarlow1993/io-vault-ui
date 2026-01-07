import type { Chain } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import {
  batchGetTokenMetadataItems,
  getTokenMetadataItem,
  putTokenMetadataItem,
} from '@/src/services/balances/metadata/ddb.js';
import { TokenMetadataKeys } from '@/src/services/balances/metadata/keys.js';
import {
  fetchTokenMetadata,
  fetchNativeTokenMetadata,
} from '@/src/services/coingecko/index.js';
import type { TokenMetadata } from '@/src/types/token-metadata.js';
import type { ProviderTokenBalance } from '@/src/services/balances/index.js';

const TOKEN_SYMBOL_LENGTH = 4;
const TTL_THIRTY_DAYS = 30 * 24 * 60 * 60;

export const fetchTokenMetadataBulk = async ({
  chain,
  tokens,
}: {
  chain: Chain;
  tokens: ProviderTokenBalance[];
}) => {
  const existingTokens = await batchGetTokenMetadataItems(
    chain.Alias,
    tokens.map((token) => token.address)
  );

  const missingTokens = tokens.filter(
    (token) =>
      !existingTokens.some(
        (existingToken: TokenMetadata.DynamoDBTokenMetadata) =>
          existingToken.address === token.address.toLowerCase()
      ) && token.address.length > TOKEN_SYMBOL_LENGTH
  );

  // Some Providers will return NATIVE tokens as part of the tokens query, we want to filter these out and only save non-native tokens in this function
  const filteredMissingTokens = missingTokens.filter(
    (token) => token.address.length > TOKEN_SYMBOL_LENGTH
  );
  const updatedTokens: TokenMetadata.DynamoDBTokenMetadata[] = [];
  await Promise.allSettled(
    filteredMissingTokens.map(async (token) => {
      const metadata = await fetchTokenMetadata(chain, token.address);
      const lowerCaseTokenAddress = token.address.toLowerCase();
      const now = new Date().toISOString();
      const item = {
        chain: chain.Alias,
        PK: TokenMetadataKeys.pk(chain.Alias),
        SK: TokenMetadataKeys.sk(lowerCaseTokenAddress),
        decimals: token.decimals,
        updatedAt: now,
        createdAt: now,
        address: lowerCaseTokenAddress,
        logoUrl: metadata?.image?.small,
        name: metadata?.name,
        symbol: token.symbol,
        // Set TTL when metadata not found (null) to retry later
        ttl: metadata === null ? TTL_THIRTY_DAYS : undefined,
      };
      await putTokenMetadataItem(item);
      updatedTokens.push(item);
    })
  );

  return [...existingTokens, ...updatedTokens];
};

export const getNativeTokenMetadata = async ({
  chain,
  symbol,
}: {
  chain: Chain;
  symbol: string;
}): Promise<TokenMetadata.DynamoDBTokenMetadata | undefined> => {
  const existingMetadata = await getTokenMetadataItem({ chain: chain.Alias, address: symbol });
  if (existingMetadata) {
    return existingMetadata;
  }
  const metadata = await fetchNativeTokenMetadata(chain);
  const now = new Date().toISOString();
  const item = {
    chain: chain.Alias,
    PK: TokenMetadataKeys.pk(chain.Alias),
    SK: TokenMetadataKeys.sk(symbol),
    updatedAt: now,
    createdAt: now,
    logoUrl: metadata?.image?.small,
    name: metadata?.name,
    symbol,
  };

  await putTokenMetadataItem(item);
  return item;
};
