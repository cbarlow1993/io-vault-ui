# CoinGecko SDK Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate from manual `fetch()` calls to the official `@coingecko/coingecko-typescript` SDK.

**Architecture:** Thin client factory provides configured SDK singleton. Consumers use SDK directly for their needs. Remove all manual fetch logic, Zod schemas, and custom response wrappers.

**Tech Stack:** `@coingecko/coingecko-typescript`, TypeScript, Vitest

---

## Task 1: Install SDK Package

**Files:**
- Modify: `package.json`

**Step 1: Install the SDK**

Run:
```bash
npm install @coingecko/coingecko-typescript
```

**Step 2: Verify installation**

Run:
```bash
npm ls @coingecko/coingecko-typescript
```

Expected: Package listed in dependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @coingecko/coingecko-typescript SDK"
```

---

## Task 2: Create SDK Client Factory

**Files:**
- Create: `src/services/coingecko/client.ts`
- Test: `tests/unit/services/coingecko/client.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/services/coingecko/client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the config before importing
vi.mock('@/src/lib/config.js', () => ({
  config: {
    apis: {
      coinGecko: {
        apiKey: 'test-pro-api-key',
        requestTimeout: 10000,
      },
    },
  },
}));

// Mock the SDK
vi.mock('@coingecko/coingecko-typescript', () => {
  return {
    default: vi.fn().mockImplementation((options) => ({
      _options: options,
    })),
  };
});

import { getCoinGeckoClient, resetCoinGeckoClient } from '@/src/services/coingecko/client.js';
import Coingecko from '@coingecko/coingecko-typescript';

describe('CoinGecko Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCoinGeckoClient();
  });

  it('should create client with pro API key when configured', () => {
    const client = getCoinGeckoClient();

    expect(Coingecko).toHaveBeenCalledWith({
      proAPIKey: 'test-pro-api-key',
      timeout: 10000,
    });
    expect(client).toBeDefined();
  });

  it('should return the same instance on subsequent calls (singleton)', () => {
    const client1 = getCoinGeckoClient();
    const client2 = getCoinGeckoClient();

    expect(client1).toBe(client2);
    expect(Coingecko).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- tests/unit/services/coingecko/client.test.ts
```

Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/services/coingecko/client.ts`:

```typescript
import Coingecko from '@coingecko/coingecko-typescript';
import { config } from '@/src/lib/config.js';

let clientInstance: Coingecko | null = null;

export function getCoinGeckoClient(): Coingecko {
  if (!clientInstance) {
    const apiKey = config.apis.coinGecko.apiKey;

    clientInstance = new Coingecko({
      proAPIKey: apiKey,
      timeout: config.apis.coinGecko.requestTimeout,
    });
  }
  return clientInstance;
}

/** Reset client instance - only for testing */
export function resetCoinGeckoClient(): void {
  clientInstance = null;
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- tests/unit/services/coingecko/client.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/coingecko/client.ts tests/unit/services/coingecko/client.test.ts
git commit -m "feat: add CoinGecko SDK client factory"
```

---

## Task 3: Rewrite CoinGecko Service

**Files:**
- Modify: `src/services/coingecko/index.ts`
- Create: `tests/unit/services/coingecko/index.test.ts`

**Step 1: Write the failing tests**

Create `tests/unit/services/coingecko/index.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockContractGet = vi.fn();

vi.mock('@/src/services/coingecko/client.js', () => ({
  getCoinGeckoClient: vi.fn(() => ({
    coins: {
      id: { get: mockGet },
      contract: { contractAddress: { get: mockContractGet } },
    },
  })),
}));

vi.mock('@/src/lib/chainAliasMapper.js', () => ({
  mapChainAliasToCoinGeckoAssetPlatform: vi.fn((alias) => alias === 'ethereum' ? 'ethereum' : null),
  mapChainAliasToCoinGeckoNativeCoinId: vi.fn((alias) => alias === 'ethereum' ? 'ethereum' : null),
}));

vi.mock('@/utils/powertools.js', () => ({
  logger: { warn: vi.fn(), debug: vi.fn() },
}));

import { fetchTokenMetadata, fetchNativeTokenMetadata, getTokenUsdPrice } from '@/src/services/coingecko/index.js';

describe('CoinGecko Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchTokenMetadata', () => {
    it('should return token metadata on success', async () => {
      const mockData = {
        id: 'usd-coin',
        symbol: 'usdc',
        name: 'USD Coin',
        image: { small: 'https://example.com/usdc.png' },
        market_data: { current_price: { usd: 1.0 } },
      };
      mockContractGet.mockResolvedValue(mockData);

      const chain = { Alias: 'ethereum' } as any;
      const result = await fetchTokenMetadata(chain, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');

      expect(result).toEqual(mockData);
      expect(mockContractGet).toHaveBeenCalledWith({
        id: 'ethereum',
        contract_address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      });
    });

    it('should return null on error', async () => {
      mockContractGet.mockRejectedValue(new Error('Not found'));

      const chain = { Alias: 'ethereum' } as any;
      const result = await fetchTokenMetadata(chain, '0xinvalid');

      expect(result).toBeNull();
    });
  });

  describe('fetchNativeTokenMetadata', () => {
    it('should return native token metadata on success', async () => {
      const mockData = {
        id: 'ethereum',
        symbol: 'eth',
        name: 'Ethereum',
        image: { small: 'https://example.com/eth.png' },
        market_data: { current_price: { usd: 2000 } },
      };
      mockGet.mockResolvedValue(mockData);

      const chain = { Alias: 'ethereum' } as any;
      const result = await fetchNativeTokenMetadata(chain);

      expect(result).toEqual(mockData);
      expect(mockGet).toHaveBeenCalledWith({ id: 'ethereum' });
    });

    it('should return null on error', async () => {
      mockGet.mockRejectedValue(new Error('Not found'));

      const chain = { Alias: 'ethereum' } as any;
      const result = await fetchNativeTokenMetadata(chain);

      expect(result).toBeNull();
    });
  });

  describe('getTokenUsdPrice', () => {
    it('should return USD price on success', async () => {
      mockContractGet.mockResolvedValue({
        market_data: { current_price: { usd: 1.5 } },
      });

      const result = await getTokenUsdPrice('ethereum', '0xtoken');

      expect(result).toBe(1.5);
    });

    it('should return null on error', async () => {
      mockContractGet.mockRejectedValue(new Error('Not found'));

      const result = await getTokenUsdPrice('ethereum', '0xtoken');

      expect(result).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- tests/unit/services/coingecko/index.test.ts
```

Expected: FAIL - old exports don't match

**Step 3: Rewrite the implementation**

Replace `src/services/coingecko/index.ts`:

```typescript
import type { Chain, ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { getCoinGeckoClient } from './client.js';
import {
  mapChainAliasToCoinGeckoAssetPlatform,
  mapChainAliasToCoinGeckoNativeCoinId,
} from '@/src/lib/chainAliasMapper.js';
import { logger } from '@/utils/powertools.js';

/** SDK coin data type - inferred from SDK response */
type CoinData = Awaited<ReturnType<ReturnType<typeof getCoinGeckoClient>['coins']['id']['get']>>;

export type { CoinData };

/**
 * Fetch token metadata by contract address
 */
export async function fetchTokenMetadata(
  chain: Chain,
  address: string
): Promise<CoinData | null> {
  const client = getCoinGeckoClient();
  const platform = mapChainAliasToCoinGeckoAssetPlatform(chain.Alias);

  if (!platform) {
    logger.warn('Chain not supported by CoinGecko', { chain: chain.Alias });
    return null;
  }

  try {
    return await client.coins.contract.contractAddress.get({
      id: platform,
      contract_address: address,
    });
  } catch (error) {
    logger.warn('Failed to fetch token metadata from CoinGecko', {
      chain: chain.Alias,
      address,
      error,
    });
    return null;
  }
}

/**
 * Fetch native token metadata by chain
 */
export async function fetchNativeTokenMetadata(chain: Chain): Promise<CoinData | null> {
  const client = getCoinGeckoClient();
  const coinId = mapChainAliasToCoinGeckoNativeCoinId(chain.Alias);

  if (!coinId) {
    logger.warn('Chain native token not mapped in CoinGecko', { chain: chain.Alias });
    return null;
  }

  try {
    return await client.coins.id.get({ id: coinId });
  } catch (error) {
    logger.warn('Failed to fetch native token metadata from CoinGecko', {
      chain: chain.Alias,
      error,
    });
    return null;
  }
}

/**
 * Get USD price for a token by contract address
 */
export async function getTokenUsdPrice(
  chain: ChainAlias,
  address: string
): Promise<number | null> {
  const client = getCoinGeckoClient();
  const platform = mapChainAliasToCoinGeckoAssetPlatform(chain);

  if (!platform) {
    return null;
  }

  try {
    const data = await client.coins.contract.contractAddress.get({
      id: platform,
      contract_address: address,
    });
    return data.market_data?.current_price?.usd ?? null;
  } catch (error) {
    logger.warn('Failed to fetch token USD price from CoinGecko', {
      chain,
      address,
      error,
    });
    return null;
  }
}

/**
 * Get USD price for native token by chain
 */
export async function getNativeTokenUsdPrice(chain: Chain): Promise<number | null> {
  const metadata = await fetchNativeTokenMetadata(chain);
  return metadata?.market_data?.current_price?.usd ?? null;
}
```

**Step 4: Run tests to verify they pass**

Run:
```bash
npm test -- tests/unit/services/coingecko/index.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/coingecko/index.ts tests/unit/services/coingecko/index.test.ts
git commit -m "refactor: rewrite CoinGecko service to use SDK"
```

---

## Task 4: Update metadata.ts Consumer

**Files:**
- Modify: `src/services/balances/metadata/metadata.ts`

**Step 1: Update the imports and usage**

Replace the CoinGecko import and usage in `src/services/balances/metadata/metadata.ts`:

```typescript
import type { Chain } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import {
  batchGetTokenMetadataItems,
  getTokenMetadataItem,
  putTokenMetadataItem,
} from '@/src/services/balances/metadata/ddb.js';
import { TokenMetadataKeys } from '@/src/services/balances/metadata/keys.js';
import { fetchTokenMetadata, fetchNativeTokenMetadata } from '@/src/services/coingecko/index.js';
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

  const filteredMissingTokens = missingTokens.filter(
    (token) => token.address.length > TOKEN_SYMBOL_LENGTH
  );
  const updatedTokens: TokenMetadata.DynamoDBTokenMetadata[] = [];
  await Promise.allSettled(
    filteredMissingTokens.map(async (token) => {
      const data = await fetchTokenMetadata(chain, token.address);
      // data is null on error or not found
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
        logoUrl: data?.image?.small,
        name: data?.name,
        symbol: token.symbol,
        coingeckoId: data?.id,
        ttl: data === null ? TTL_THIRTY_DAYS : undefined,
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
  const data = await fetchNativeTokenMetadata(chain);
  const item = {
    chain: chain.Alias,
    PK: TokenMetadataKeys.pk(chain.Alias),
    SK: TokenMetadataKeys.sk(symbol),
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    logoUrl: data?.image?.small,
    name: data?.name,
    coingeckoId: data?.id,
    symbol,
  };

  await putTokenMetadataItem(item);
  return item;
};
```

**Step 2: Run existing tests**

Run:
```bash
npm test -- tests/unit/services/balances
```

Expected: Tests should pass (may need mock updates)

**Step 3: Commit**

```bash
git add src/services/balances/metadata/metadata.ts
git commit -m "refactor: update metadata service to use new CoinGecko SDK"
```

---

## Task 5: Refactor PricingService

**Files:**
- Modify: `src/services/balances/pricing-service.ts`
- Modify: `tests/unit/services/balances/pricing-service.test.ts`

**Step 1: Update the tests to mock SDK instead of fetch**

Replace `tests/unit/services/balances/pricing-service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PricingService } from '@/src/services/balances/pricing-service.js';
import type { TokenPriceRepository } from '@/src/repositories/types.js';

vi.mock('@/utils/powertools.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockSimplePriceGet = vi.fn();

vi.mock('@/src/services/coingecko/client.js', () => ({
  getCoinGeckoClient: vi.fn(() => ({
    simple: {
      price: {
        get: mockSimplePriceGet,
      },
    },
  })),
}));

function createMockPriceRepository() {
  return {
    findByCoingeckoId: vi.fn(),
    findByCoingeckoIds: vi.fn(),
    findFreshPrices: vi.fn(),
    upsertMany: vi.fn(),
  } as unknown as TokenPriceRepository;
}

describe('PricingService', () => {
  let priceRepository: ReturnType<typeof createMockPriceRepository>;
  let service: PricingService;

  beforeEach(() => {
    priceRepository = createMockPriceRepository();
    service = new PricingService(priceRepository, {
      cacheTtlSeconds: 60,
    });
    mockSimplePriceGet.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPrices', () => {
    it('should return empty map for empty coingecko ids', async () => {
      const result = await service.getPrices([]);

      expect(result.size).toBe(0);
      expect(priceRepository.findFreshPrices).not.toHaveBeenCalled();
    });

    it('should return cached prices when available', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([
        {
          id: 'price-1',
          coingeckoId: 'ethereum',
          currency: 'usd',
          price: '2000.50',
          priceChange24h: '5.25',
          marketCap: '250000000000',
          fetchedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getPrices(['ethereum'], 'usd');

      expect(result.size).toBe(1);
      expect(result.get('ethereum')).toEqual({
        coingeckoId: 'ethereum',
        price: 2000.5,
        priceChange24h: 5.25,
        marketCap: 250000000000,
        isStale: false,
      });
      expect(mockSimplePriceGet).not.toHaveBeenCalled();
    });

    it('should fetch missing prices from CoinGecko SDK', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([]);
      vi.mocked(priceRepository.upsertMany).mockResolvedValue();

      mockSimplePriceGet.mockResolvedValue({
        ethereum: {
          usd: 2000,
          usd_24h_change: 5.5,
          usd_market_cap: 250000000000,
        },
      });

      const result = await service.getPrices(['ethereum'], 'usd');

      expect(result.size).toBe(1);
      expect(result.get('ethereum')).toEqual({
        coingeckoId: 'ethereum',
        price: 2000,
        priceChange24h: 5.5,
        marketCap: 250000000000,
        isStale: false,
      });

      expect(mockSimplePriceGet).toHaveBeenCalledWith({
        ids: 'ethereum',
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_market_cap: true,
      });

      expect(priceRepository.upsertMany).toHaveBeenCalledWith([
        {
          coingeckoId: 'ethereum',
          currency: 'usd',
          price: '2000',
          priceChange24h: '5.5',
          marketCap: '250000000000',
        },
      ]);
    });

    it('should deduplicate coingecko ids', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([
        {
          id: 'price-1',
          coingeckoId: 'ethereum',
          currency: 'usd',
          price: '2000',
          priceChange24h: null,
          marketCap: null,
          fetchedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getPrices(['ethereum', 'ethereum', 'ethereum'], 'usd');

      expect(result.size).toBe(1);
      expect(priceRepository.findFreshPrices).toHaveBeenCalledWith(['ethereum'], 'usd', 60);
    });

    it('should combine cached and fresh prices', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([
        {
          id: 'price-1',
          coingeckoId: 'ethereum',
          currency: 'usd',
          price: '2000',
          priceChange24h: '5',
          marketCap: null,
          fetchedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      vi.mocked(priceRepository.upsertMany).mockResolvedValue();

      mockSimplePriceGet.mockResolvedValue({
        bitcoin: {
          usd: 40000,
          usd_24h_change: -2.5,
          usd_market_cap: 800000000000,
        },
      });

      const result = await service.getPrices(['ethereum', 'bitcoin'], 'usd');

      expect(result.size).toBe(2);
      expect(result.get('ethereum')?.price).toBe(2000);
      expect(result.get('ethereum')?.isStale).toBe(false);
      expect(result.get('bitcoin')?.price).toBe(40000);
      expect(result.get('bitcoin')?.isStale).toBe(false);
    });

    it('should fall back to stale prices on CoinGecko error', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([]);
      vi.mocked(priceRepository.findByCoingeckoIds).mockResolvedValue([
        {
          id: 'price-1',
          coingeckoId: 'ethereum',
          currency: 'usd',
          price: '1800',
          priceChange24h: '3',
          marketCap: null,
          fetchedAt: new Date(Date.now() - 120000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      mockSimplePriceGet.mockRejectedValue(new Error('API Error'));

      const result = await service.getPrices(['ethereum'], 'usd');

      expect(result.size).toBe(1);
      expect(result.get('ethereum')).toEqual({
        coingeckoId: 'ethereum',
        price: 1800,
        priceChange24h: 3,
        marketCap: null,
        isStale: true,
      });
    });

    it('should handle tokens not found in CoinGecko response', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([]);
      vi.mocked(priceRepository.upsertMany).mockResolvedValue();

      mockSimplePriceGet.mockResolvedValue({
        ethereum: { usd: 2000 },
        // bitcoin is not returned
      });

      const result = await service.getPrices(['ethereum', 'bitcoin'], 'usd');

      expect(result.size).toBe(1);
      expect(result.has('ethereum')).toBe(true);
      expect(result.has('bitcoin')).toBe(false);
    });

    it('should handle null priceChange24h and marketCap', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([
        {
          id: 'price-1',
          coingeckoId: 'ethereum',
          currency: 'usd',
          price: '2000',
          priceChange24h: null,
          marketCap: null,
          fetchedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getPrices(['ethereum'], 'usd');

      expect(result.get('ethereum')?.priceChange24h).toBeNull();
      expect(result.get('ethereum')?.marketCap).toBeNull();
    });
  });

  describe('configuration', () => {
    it('should use default cache TTL when not configured', async () => {
      const defaultService = new PricingService(priceRepository);

      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([]);
      vi.mocked(priceRepository.upsertMany).mockResolvedValue();

      mockSimplePriceGet.mockResolvedValue({ ethereum: { usd: 2000 } });

      await defaultService.getPrices(['ethereum'], 'usd');

      expect(priceRepository.findFreshPrices).toHaveBeenCalledWith(['ethereum'], 'usd', 60);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run:
```bash
npm test -- tests/unit/services/balances/pricing-service.test.ts
```

Expected: FAIL - service still uses fetch

**Step 3: Rewrite the service**

Replace `src/services/balances/pricing-service.ts`:

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

export interface PricingServiceConfig {
  cacheTtlSeconds?: number;
}

export class PricingService {
  private readonly cacheTtlSeconds: number;

  constructor(
    private readonly priceRepository: TokenPriceRepository,
    config: PricingServiceConfig = {}
  ) {
    this.cacheTtlSeconds = config.cacheTtlSeconds ?? 60;
  }

  async getPrices(
    coingeckoIds: string[],
    currency: string = 'usd'
  ): Promise<Map<string, TokenPriceInfo>> {
    if (coingeckoIds.length === 0) {
      return new Map();
    }

    const uniqueIds = [...new Set(coingeckoIds)];
    const result = new Map<string, TokenPriceInfo>();

    // Check cache first
    const cachedPrices = await this.priceRepository.findFreshPrices(
      uniqueIds,
      currency,
      this.cacheTtlSeconds
    );

    const cachedIds = new Set<string>();
    for (const cached of cachedPrices) {
      cachedIds.add(cached.coingeckoId);
      result.set(cached.coingeckoId, {
        coingeckoId: cached.coingeckoId,
        price: parseFloat(cached.price),
        priceChange24h: cached.priceChange24h ? parseFloat(cached.priceChange24h) : null,
        marketCap: cached.marketCap ? parseFloat(cached.marketCap) : null,
        isStale: false,
      });
    }

    // Fetch missing prices from CoinGecko SDK
    const missingIds = uniqueIds.filter((id) => !cachedIds.has(id));
    if (missingIds.length > 0) {
      try {
        const freshPrices = await this.fetchFromCoinGecko(missingIds, currency);

        // Update cache
        const cacheInputs: CreateTokenPriceInput[] = [];
        for (const [id, price] of freshPrices) {
          result.set(id, { ...price, isStale: false });
          cacheInputs.push({
            coingeckoId: id,
            currency,
            price: price.price.toString(),
            priceChange24h: price.priceChange24h?.toString() ?? null,
            marketCap: price.marketCap?.toString() ?? null,
          });
        }

        if (cacheInputs.length > 0) {
          await this.priceRepository.upsertMany(cacheInputs);
        }
      } catch (error) {
        logger.error('Failed to fetch prices from CoinGecko, falling back to stale cache', {
          error,
          missingIds,
          currency,
        });

        // On error, try to get stale prices
        const stalePrices = await this.priceRepository.findByCoingeckoIds(missingIds, currency);

        for (const stale of stalePrices) {
          result.set(stale.coingeckoId, {
            coingeckoId: stale.coingeckoId,
            price: parseFloat(stale.price),
            priceChange24h: stale.priceChange24h ? parseFloat(stale.priceChange24h) : null,
            marketCap: stale.marketCap ? parseFloat(stale.marketCap) : null,
            isStale: true,
          });
        }
      }
    }

    return result;
  }

  private async fetchFromCoinGecko(
    ids: string[],
    currency: string
  ): Promise<Map<string, Omit<TokenPriceInfo, 'isStale'>>> {
    const result = new Map<string, Omit<TokenPriceInfo, 'isStale'>>();
    const client = getCoinGeckoClient();

    // CoinGecko limits to 250 IDs per request
    const batches = this.chunk(ids, 250);

    for (const batch of batches) {
      const data = await client.simple.price.get({
        ids: batch.join(','),
        vs_currencies: currency,
        include_24hr_change: true,
        include_market_cap: true,
      });

      for (const id of batch) {
        const priceData = data[id];
        if (priceData) {
          result.set(id, {
            coingeckoId: id,
            price: priceData[currency] ?? 0,
            priceChange24h: priceData[`${currency}_24h_change`] ?? null,
            marketCap: priceData[`${currency}_market_cap`] ?? null,
          });
        }
      }
    }

    return result;
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
```

**Step 4: Run tests to verify they pass**

Run:
```bash
npm test -- tests/unit/services/balances/pricing-service.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/balances/pricing-service.ts tests/unit/services/balances/pricing-service.test.ts
git commit -m "refactor: update PricingService to use CoinGecko SDK"
```

---

## Task 6: Update TokenMetadataFetcher

**Files:**
- Modify: `src/services/transaction-processor/token-metadata-fetcher.ts`
- Modify: `tests/unit/services/transaction-processor/token-metadata-fetcher.test.ts` (if exists)

**Step 1: Update the implementation**

Replace `src/services/transaction-processor/token-metadata-fetcher.ts`:

```typescript
import { JsonRpcProvider, Contract } from 'ethers';
import { logger } from '@/utils/powertools.js';
import { getCoinGeckoPlatform } from '@/src/config/chain-mappings/index.js';
import { getCoinGeckoClient } from '@/src/services/coingecko/client.js';
import type { TokenInfo } from '@/src/services/transaction-processor/types.js';

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

export interface TokenMetadataFetcherConfig {
  rpcUrls?: Record<string, string>;
}

export interface TokenMetadataResult extends TokenInfo {
  coingeckoId?: string;
  logoUri?: string;
}

export class TokenMetadataFetcher {
  private readonly rpcUrls: Record<string, string>;

  constructor(config: TokenMetadataFetcherConfig = {}) {
    this.rpcUrls = config.rpcUrls ?? {};
  }

  /**
   * Fetches token metadata from on-chain RPC calls.
   */
  async fetchOnChain(chainAlias: string, address: string): Promise<Partial<TokenInfo>> {
    const rpcUrl = this.rpcUrls[chainAlias];
    if (!rpcUrl) {
      return { address: address.toLowerCase() };
    }

    const provider = new JsonRpcProvider(rpcUrl);
    const contract = new Contract(address, ERC20_ABI, provider);

    const result: Partial<TokenInfo> = {
      address: address.toLowerCase(),
    };

    try {
      result.name = await contract.name!();
    } catch {
      // Token may not have name() function
    }

    try {
      result.symbol = await contract.symbol!();
    } catch {
      // Token may not have symbol() function
    }

    try {
      result.decimals = await contract.decimals!();
    } catch {
      // Token may not have decimals() function
    }

    return result;
  }

  /**
   * Fetches token metadata from CoinGecko using the SDK.
   */
  async fetchFromCoinGecko(
    chainAlias: string,
    address: string
  ): Promise<{ coingeckoId: string | null; logoUri: string | null } | null> {
    const platform = getCoinGeckoPlatform(chainAlias);
    if (!platform) {
      return null;
    }

    try {
      const client = getCoinGeckoClient();
      const data = await client.coins.contract.contractAddress.get({
        id: platform,
        contract_address: address.toLowerCase(),
      });

      return {
        coingeckoId: data.id ?? null,
        logoUri: data.image?.large ?? data.image?.small ?? null,
      };
    } catch (error) {
      logger.warn('Failed to fetch token from CoinGecko', { address, chainAlias, error });
      return null;
    }
  }

  /**
   * Fetches complete token metadata from on-chain RPC and CoinGecko.
   */
  async fetch(chainAlias: string, address: string): Promise<TokenMetadataResult> {
    const [onChain, coinGecko] = await Promise.all([
      this.fetchOnChain(chainAlias, address),
      this.fetchFromCoinGecko(chainAlias, address),
    ]);

    return {
      address: address.toLowerCase(),
      name: onChain.name,
      symbol: onChain.symbol,
      decimals: onChain.decimals,
      coingeckoId: coinGecko?.coingeckoId ?? undefined,
      logoUri: coinGecko?.logoUri ?? undefined,
    };
  }
}
```

**Step 2: Run existing tests**

Run:
```bash
npm test -- tests/unit/services/transaction-processor
```

Expected: Tests should pass (may need mock updates)

**Step 3: Commit**

```bash
git add src/services/transaction-processor/token-metadata-fetcher.ts
git commit -m "refactor: update TokenMetadataFetcher to use CoinGecko SDK"
```

---

## Task 7: Update Config (Remove apiUrl)

**Files:**
- Modify: `src/lib/config.ts`

**Step 1: Remove apiUrl from config schema**

In `src/lib/config.ts`, update the coinGecko config:

```typescript
coinGecko: z.object({
  apiKey: z.string().optional(),
  requestTimeout: z.coerce.number().default(5000),
}),
```

And update the loadConfig function:

```typescript
coinGecko: {
  apiKey: process.env.COIN_GECKO_API_KEY,
  requestTimeout: process.env.COIN_GECKO_REQUEST_TIMEOUT,
},
```

**Step 2: Run tests**

Run:
```bash
npm test
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/config.ts
git commit -m "refactor: remove apiUrl from CoinGecko config (SDK handles it)"
```

---

## Task 8: Run Full Test Suite & Fix Any Issues

**Step 1: Run all tests**

Run:
```bash
npm test
```

**Step 2: Fix any failing tests**

Address any remaining test failures by updating mocks or implementations.

**Step 3: Run build**

Run:
```bash
npm run build
```

Expected: Build succeeds without errors

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve remaining test and build issues"
```

---

## Task 9: Cleanup Unused Code

**Files:**
- Review: `src/services/coingecko/index.ts` - ensure old exports removed
- Review: `.env.example` - remove COIN_GECKO_API_URL if present

**Step 1: Verify no old exports remain**

Ensure the following are removed:
- `CoinGecko` namespace
- `CoinGecko.TokenMetadata` type
- `CoinGeckoResponseSchema` Zod schema
- Manual fetch helpers

**Step 2: Update .env.example if needed**

Remove `COIN_GECKO_API_URL` line if present.

**Step 3: Commit cleanup**

```bash
git add -A
git commit -m "chore: cleanup unused CoinGecko code and config"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Install SDK | `package.json` |
| 2 | Create client factory | `src/services/coingecko/client.ts` |
| 3 | Rewrite CoinGecko service | `src/services/coingecko/index.ts` |
| 4 | Update metadata consumer | `src/services/balances/metadata/metadata.ts` |
| 5 | Refactor PricingService | `src/services/balances/pricing-service.ts` |
| 6 | Update TokenMetadataFetcher | `src/services/transaction-processor/token-metadata-fetcher.ts` |
| 7 | Update config | `src/lib/config.ts` |
| 8 | Run full test suite | - |
| 9 | Cleanup unused code | Various |

**Note:** `coingecko-provider.ts` does NOT need changes - it only checks if tokens have `coingeckoId`, it doesn't call the API.
