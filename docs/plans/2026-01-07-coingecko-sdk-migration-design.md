# CoinGecko SDK Migration Design

## Overview

Migrate from manual `fetch()` calls to the official `@coingecko/coingecko-typescript` SDK for all CoinGecko API interactions.

## Decisions

| Decision | Choice |
|----------|--------|
| SDK | `@coingecko/coingecko-typescript` (official) |
| Backward compatibility | None - clean break, re-implement where needed |
| Service structure | Thin SDK wrapper + consumers use SDK directly |
| Response validation | Trust SDK types, remove Zod schemas |

## Architecture

### SDK Client Factory

New file `src/services/coingecko/client.ts` provides a configured singleton client:

```typescript
import Coingecko from '@coingecko/coingecko-typescript';
import { config } from '@/src/lib/config.js';

let clientInstance: Coingecko | null = null;

export function getCoinGeckoClient(): Coingecko {
  if (!clientInstance) {
    const apiKey = config.apis.coinGecko.apiKey;

    clientInstance = new Coingecko({
      proAPIKey: apiKey,
      environment: apiKey ? 'pro' : 'demo',
      timeout: config.apis.coinGecko.requestTimeout,
    });
  }
  return clientInstance;
}

export type { Coingecko };
```

### CoinGecko Metadata Service

Simplified `src/services/coingecko/index.ts` with plain function exports:

```typescript
import type { Chain, ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { getCoinGeckoClient } from './client.js';
import {
  mapChainAliasToCoinGeckoAssetPlatform,
  mapChainAliasToCoinGeckoNativeCoinId,
} from '@/src/lib/chainAliasMapper.js';
import { logger } from '@/utils/powertools.js';

type CoinData = Awaited<ReturnType<ReturnType<typeof getCoinGeckoClient>['coins']['id']['get']>>;

export async function fetchTokenMetadata(chain: Chain, address: string): Promise<CoinData | null> {
  const client = getCoinGeckoClient();
  const platform = mapChainAliasToCoinGeckoAssetPlatform(chain.Alias);

  try {
    return await client.coins.contract.contractAddress.get({
      id: platform,
      contract_address: address,
    });
  } catch (error) {
    logger.warn('Failed to fetch token metadata', { chain: chain.Alias, address, error });
    return null;
  }
}

export async function fetchNativeTokenMetadata(chain: Chain): Promise<CoinData | null> {
  const client = getCoinGeckoClient();
  const coinId = mapChainAliasToCoinGeckoNativeCoinId(chain.Alias);

  try {
    return await client.coins.id.get({ id: coinId });
  } catch (error) {
    logger.warn('Failed to fetch native token metadata', { chain: chain.Alias, error });
    return null;
  }
}

export async function getTokenUsdPrice(chain: ChainAlias, address: string): Promise<number | null> {
  const client = getCoinGeckoClient();
  const platform = mapChainAliasToCoinGeckoAssetPlatform(chain);

  try {
    const data = await client.coins.contract.contractAddress.get({
      id: platform,
      contract_address: address,
    });
    return data.market_data?.current_price?.usd ?? null;
  } catch (error) {
    logger.warn('Failed to fetch token price', { chain, address, error });
    return null;
  }
}
```

### PricingService Refactor

Updated `src/services/balances/pricing-service.ts`:

```typescript
import { getCoinGeckoClient } from '@/src/services/coingecko/client.js';
import type { TokenPriceRepository, CreateTokenPriceInput } from '@/src/repositories/types.js';
import { logger } from '@/utils/powertools.js';

export interface TokenPriceInfo {
  coingeckoId: string;
  price: number;
  priceChange24h: number | null;
  marketCap: number | null;
  isStale: boolean;
}

export class PricingService {
  private readonly cacheTtlSeconds: number;

  constructor(
    private readonly priceRepository: TokenPriceRepository,
    config: { cacheTtlSeconds?: number } = {}
  ) {
    this.cacheTtlSeconds = config.cacheTtlSeconds ?? 60;
  }

  async getPrices(coingeckoIds: string[], currency = 'usd'): Promise<Map<string, TokenPriceInfo>> {
    // Cache check logic unchanged...

    // Fetch missing from SDK
    const client = getCoinGeckoClient();
    const response = await client.simple.price.get({
      ids: batch.join(','),
      vs_currencies: currency,
      include_24hr_change: true,
      include_market_cap: true,
    });

    // Map SDK response to TokenPriceInfo...
  }
}
```

## Consumer Updates

### Pattern Change

```typescript
// Before
import { CoinGecko } from '@/src/services/coingecko/index.js';
const result = await CoinGecko.fetchMetadata({ chain, address });
if (result.error) { ... }
const metadata = result.data;

// After
import { fetchTokenMetadata } from '@/src/services/coingecko/index.js';
const metadata = await fetchTokenMetadata(chain, address);
if (!metadata) { ... }
```

### Files to Update

1. `src/services/balances/metadata/metadata.ts`
2. `src/services/transaction-processor/token-metadata-fetcher.ts`
3. `src/services/spam/providers/coingecko-provider.ts`

## Removals

### From `src/services/coingecko/index.ts`
- `CoinGecko` namespace wrapper
- `CoinGecko.Error`, `CoinGecko.Response` types
- `CoinGeckoRawResponse` interface
- `CoinGeckoResponseSchema` Zod schema
- `CoinGecko.TokenMetadata` custom type
- `parseCoinGeckoResponse()` helper
- `getCoinGeckoApiUrl()`, `getCoinGeckoApiKey()`, `getRequestTimeout()` helpers
- Manual `fetch()` calls

### From `src/services/balances/pricing-service.ts`
- `CoinGeckoPriceData` interface
- `CoinGeckoPriceResponse` type
- `baseUrl`, `apiKey`, `requestTimeoutMs` properties
- Manual URL construction and fetch logic

### From `src/lib/config.ts`
- `apiUrl` property (SDK handles endpoint selection)

## Test Updates

- `tests/unit/services/coingecko/` - mock SDK client
- `tests/unit/services/balances/pricing-service.test.ts` - mock SDK instead of fetch
- `tests/unit/services/spam/providers/coingecko-provider.test.ts` - update for new signatures

## Installation

```bash
npm install @coingecko/coingecko-typescript
```
