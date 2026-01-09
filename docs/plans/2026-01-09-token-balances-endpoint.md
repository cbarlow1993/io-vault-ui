# Token Balances Endpoint Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the `/tokens` endpoint to properly filter by spam status, cache balances, handle failures gracefully, and support sorting/pagination with a max limit of 20.

**Architecture:** The endpoint uses BalanceService which fetches balances from chains package, enriches with pricing/spam data, and caches results to token_holdings. Spam filtering combines `tokens.isSpam` (global) with `token_holdings.userSpamOverride` (per-address, takes precedence).

**Tech Stack:** TypeScript, Zod (validation), Kysely (SQL), Vitest (testing), PostgreSQL

---

## Task 1: Update Pagination Max Limit

**Files:**
- Modify: `src/lib/schemas/pagination-schema.ts:15`
- Test: `tests/unit/routes/balances/balances.test.ts`

**Step 1: Update the constant**

```typescript
// src/lib/schemas/pagination-schema.ts:15
// Change from:
MAX_LIMIT_TOKENS: 200,
// To:
MAX_LIMIT_TOKENS: 20,
```

**Step 2: Run existing tests to verify no breakage**

Run: `npm run test:unit -- tests/unit/routes/balances/balances.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/lib/schemas/pagination-schema.ts
git commit -m "chore: reduce MAX_LIMIT_TOKENS from 200 to 20"
```

---

## Task 2: Add Query Parameters to Schema

**Files:**
- Modify: `src/routes/balances/schemas.ts:46-52`
- Test: `tests/unit/routes/balances/balances.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/routes/balances/balances.test.ts
// Add inside describe('GET /v2/balances/ecosystem/:ecosystem/chain/:chain/address/:address/tokens')

it('accepts sortBy and sortOrder query parameters', async () => {
  const app = await createTestApp();
  mockGetBalancesByChainAndAddress.mockResolvedValueOnce([]);

  const response = await app.inject({
    method: 'GET',
    url: `/v2/balances/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/tokens?sortBy=balance&sortOrder=asc`,
  });

  expect(response.statusCode).toBe(200);
  expect(mockGetBalancesByChainAndAddress).toHaveBeenCalledWith(
    'eth',
    TEST_ADDRESS,
    expect.objectContaining({ sortBy: 'balance', sortOrder: 'asc' })
  );
});

it('accepts showSpam query parameter', async () => {
  const app = await createTestApp();
  mockGetBalancesByChainAndAddress.mockResolvedValueOnce([]);

  const response = await app.inject({
    method: 'GET',
    url: `/v2/balances/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/tokens?showSpam=true`,
  });

  expect(response.statusCode).toBe(200);
  expect(mockGetBalancesByChainAndAddress).toHaveBeenCalledWith(
    'eth',
    TEST_ADDRESS,
    expect.objectContaining({ showSpam: true })
  );
});

it('defaults showSpam to false', async () => {
  const app = await createTestApp();
  mockGetBalancesByChainAndAddress.mockResolvedValueOnce([]);

  const response = await app.inject({
    method: 'GET',
    url: `/v2/balances/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/tokens`,
  });

  expect(response.statusCode).toBe(200);
  expect(mockGetBalancesByChainAndAddress).toHaveBeenCalledWith(
    'eth',
    TEST_ADDRESS,
    expect.objectContaining({ showSpam: false })
  );
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/routes/balances/balances.test.ts`
Expected: FAIL - showSpam and sortBy/sortOrder not passed

**Step 3: Update the schema**

```typescript
// src/routes/balances/schemas.ts:46-52
export const tokenBalanceQuerySchema = cursorPaginationTokensQuerySchema.extend({
  showHiddenTokens: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((v) => (typeof v === 'string' ? v === 'true' : v))
    .optional()
    .default(false),
  showSpam: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((v) => (typeof v === 'string' ? v === 'true' : v))
    .optional()
    .default(false),
  sortBy: z.enum(['balance', 'usdValue', 'symbol']).optional().default('usdValue'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/routes/balances/balances.test.ts`
Expected: Tests still FAIL (handler not updated yet - expected)

**Step 5: Commit schema changes**

```bash
git add src/routes/balances/schemas.ts
git commit -m "feat(schemas): add showSpam, sortBy, sortOrder query params"
```

---

## Task 3: Update Response Schema with Spam Fields

**Files:**
- Modify: `src/routes/balances/schemas.ts:71-79`

**Step 1: Update tokenBalanceItemSchema**

```typescript
// src/routes/balances/schemas.ts:71-79
export const tokenBalanceItemSchema = z.object({
  address: z.string(),
  balance: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  name: z.string().nullable(),
  logo: z.string().nullable(),
  usdValue: z.string().nullable(),
  // Spam fields
  isSpam: z.boolean(),
  userSpamOverride: z.enum(['trusted', 'spam']).nullable(),
  effectiveSpamStatus: z.enum(['spam', 'trusted', 'unknown']),
});
```

**Step 2: Run existing tests**

Run: `npm run test:unit -- tests/unit/routes/balances/balances.test.ts`
Expected: Tests may fail due to schema change - expected for now

**Step 3: Commit**

```bash
git add src/routes/balances/schemas.ts
git commit -m "feat(schemas): add spam fields to token balance response"
```

---

## Task 4: Add upsertMany to TokenHoldingRepository

**Files:**
- Modify: `src/repositories/types.ts:394-412`
- Modify: `src/repositories/token-holding.repository.ts`
- Test: `tests/unit/repositories/token-holding.repository.test.ts` (create if needed)

**Step 1: Add interface method**

```typescript
// src/repositories/types.ts - add to TokenHoldingRepository interface after line 397
export interface TokenHoldingRepository {
  findByAddressId(addressId: string): Promise<TokenHolding[]>;
  findVisibleByAddressId(addressId: string): Promise<TokenHolding[]>;
  upsert(input: CreateTokenHoldingInput): Promise<TokenHolding>;
  upsertMany(inputs: CreateTokenHoldingInput[]): Promise<TokenHolding[]>;  // NEW
  updateVisibility(id: string, visibility: 'visible' | 'hidden'): Promise<TokenHolding>;
  // ... rest
}
```

**Step 2: Implement upsertMany in repository**

```typescript
// src/repositories/token-holding.repository.ts - add after upsert method (around line 92)

async upsertMany(inputs: CreateTokenHoldingInput[]): Promise<TokenHolding[]> {
  if (inputs.length === 0) {
    return [];
  }

  return this.db.transaction().execute(async (trx) => {
    const results: TokenHolding[] = [];
    const now = new Date().toISOString();

    for (const input of inputs) {
      const id = uuidv4();
      const tokenAddress = input.tokenAddress ?? null;

      const result = await sql<TokenHoldingRow>`
        INSERT INTO token_holdings (
          id, address_id, chain_alias, token_address, is_native,
          balance, decimals, name, symbol, visibility, created_at, updated_at
        ) VALUES (
          ${id}, ${input.addressId}, ${input.chainAlias},
          ${tokenAddress}, ${input.isNative}, ${input.balance},
          ${input.decimals}, ${input.name}, ${input.symbol}, 'visible',
          ${now}::timestamptz, ${now}::timestamptz
        )
        ON CONFLICT (address_id, chain_alias, COALESCE(token_address, ''))
        DO UPDATE SET
          balance = EXCLUDED.balance,
          decimals = EXCLUDED.decimals,
          name = EXCLUDED.name,
          symbol = EXCLUDED.symbol,
          is_native = EXCLUDED.is_native,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `.execute(trx);

      const row = result.rows[0];
      if (row) {
        results.push(mapToTokenHolding(row));
      }
    }

    return results;
  });
}
```

**Step 3: Run tests**

Run: `npm run test:unit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/repositories/types.ts src/repositories/token-holding.repository.ts
git commit -m "feat(repo): add upsertMany to TokenHoldingRepository"
```

---

## Task 5: Refactor BalanceService - Add Options Interface

**Files:**
- Modify: `src/services/balances/balance-service.ts`

**Step 1: Add TokenBalanceOptions interface**

```typescript
// src/services/balances/balance-service.ts - add after line 37
export interface TokenBalanceOptions {
  includeHidden?: boolean;
  showSpam?: boolean;
  sortBy?: 'balance' | 'usdValue' | 'symbol';
  sortOrder?: 'asc' | 'desc';
}
```

**Step 2: Update method signature**

```typescript
// src/services/balances/balance-service.ts - update getBalancesByChainAndAddress
async getBalancesByChainAndAddress(
  chain: string,
  walletAddress: string,
  options?: TokenBalanceOptions
): Promise<EnrichedBalance[]> {
```

**Step 3: Commit**

```bash
git add src/services/balances/balance-service.ts
git commit -m "feat(service): add TokenBalanceOptions interface"
```

---

## Task 6: Add Spam Filtering to BalanceService

**Files:**
- Modify: `src/services/balances/balance-service.ts`

**Step 1: Add helper to compute effective spam status**

```typescript
// src/services/balances/balance-service.ts - add as private method

private computeEffectiveSpamStatus(
  isGlobalSpam: boolean,
  userOverride: 'trusted' | 'spam' | null
): 'spam' | 'trusted' | 'unknown' {
  // User override takes precedence
  if (userOverride === 'trusted') return 'trusted';
  if (userOverride === 'spam') return 'spam';
  // Fall back to global classification
  if (isGlobalSpam) return 'spam';
  return 'unknown';
}
```

**Step 2: Add spam fields to EnrichedBalance interface**

```typescript
// src/services/balances/balance-service.ts - update EnrichedBalance interface
export interface EnrichedBalance {
  tokenAddress: string | null;
  isNative: boolean;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  formattedBalance: string;
  usdPrice: number | null;
  usdValue: number | null;
  priceChange24h: number | null;
  isPriceStale: boolean;
  logoUri: string | null;
  coingeckoId: string | null;
  spamAnalysis: SpamAnalysis | null;
  // New fields
  isSpam: boolean;
  userSpamOverride: 'trusted' | 'spam' | null;
  effectiveSpamStatus: 'spam' | 'trusted' | 'unknown';
}
```

**Step 3: Add filterBySpam helper**

```typescript
// src/services/balances/balance-service.ts - add as private method

private filterBySpam(
  balances: EnrichedBalance[],
  showSpam: boolean
): EnrichedBalance[] {
  if (showSpam) {
    return balances;
  }
  return balances.filter((b) => b.effectiveSpamStatus !== 'spam');
}
```

**Step 4: Commit**

```bash
git add src/services/balances/balance-service.ts
git commit -m "feat(service): add spam filtering helpers"
```

---

## Task 7: Add Sorting to BalanceService

**Files:**
- Modify: `src/services/balances/balance-service.ts`

**Step 1: Add sortBalances helper**

```typescript
// src/services/balances/balance-service.ts - add as private method

private sortBalances(
  balances: EnrichedBalance[],
  sortBy: 'balance' | 'usdValue' | 'symbol',
  sortOrder: 'asc' | 'desc'
): EnrichedBalance[] {
  const multiplier = sortOrder === 'asc' ? 1 : -1;

  return [...balances].sort((a, b) => {
    switch (sortBy) {
      case 'balance': {
        const aVal = parseFloat(a.formattedBalance) || 0;
        const bVal = parseFloat(b.formattedBalance) || 0;
        return (aVal - bVal) * multiplier;
      }
      case 'usdValue': {
        const aVal = a.usdValue ?? 0;
        const bVal = b.usdValue ?? 0;
        return (aVal - bVal) * multiplier;
      }
      case 'symbol': {
        return a.symbol.localeCompare(b.symbol) * multiplier;
      }
      default:
        return 0;
    }
  });
}
```

**Step 2: Commit**

```bash
git add src/services/balances/balance-service.ts
git commit -m "feat(service): add balance sorting helper"
```

---

## Task 8: Add Caching with Fallback Logic

**Files:**
- Modify: `src/services/balances/balance-service.ts`
- Import: `logger` from powertools

**Step 1: Add logger import**

```typescript
// src/services/balances/balance-service.ts - add to imports
import { logger } from '@/utils/powertools.js';
```

**Step 2: Add fetchBalanceWithFallback helper**

```typescript
// src/services/balances/balance-service.ts - add as private method

private async fetchBalanceWithFallback(
  fetcher: BalanceFetcher,
  walletAddress: string,
  token: TokenInfo,
  cachedHolding: TokenHolding | undefined,
  chain: string
): Promise<RawBalance | null> {
  try {
    const [result] = await fetcher.getTokenBalances(walletAddress, [{
      address: token.address,
      decimals: token.decimals,
      symbol: token.symbol,
      name: token.name,
    }]);

    // Log if balance differs from cache
    if (cachedHolding && result && cachedHolding.balance !== result.balance) {
      logger.warn('Balance mismatch detected - reconciliation may have failed', {
        chain,
        tokenAddress: token.address,
        cachedBalance: cachedHolding.balance,
        fetchedBalance: result.balance,
        walletAddress,
      });
    }

    return result ?? null;
  } catch (error) {
    // Fall back to cached value on failure
    if (cachedHolding) {
      logger.warn('Token balance fetch failed, using cached value', {
        chain,
        tokenAddress: token.address,
        walletAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        address: walletAddress,
        tokenAddress: cachedHolding.tokenAddress,
        isNative: cachedHolding.isNative,
        balance: cachedHolding.balance,
        decimals: cachedHolding.decimals,
        symbol: cachedHolding.symbol,
        name: cachedHolding.name,
      };
    }
    // No cache available, log and skip
    logger.error('Token balance fetch failed with no cache fallback', {
      chain,
      tokenAddress: token.address,
      walletAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
```

**Step 3: Add upsertBalancesToCache helper**

```typescript
// src/services/balances/balance-service.ts - add as private method

private async upsertBalancesToCache(
  addressId: string,
  chainAlias: ChainAlias,
  balances: RawBalance[]
): Promise<void> {
  if (balances.length === 0) return;

  const inputs = balances.map((b) => ({
    addressId,
    chainAlias,
    tokenAddress: b.tokenAddress,
    isNative: b.isNative,
    balance: b.balance,
    decimals: b.decimals,
    name: b.name,
    symbol: b.symbol,
  }));

  try {
    await this.tokenHoldingRepository.upsertMany(inputs);
  } catch (error) {
    logger.error('Failed to cache token balances', {
      addressId,
      chainAlias,
      tokenCount: inputs.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

**Step 4: Commit**

```bash
git add src/services/balances/balance-service.ts
git commit -m "feat(service): add caching with fallback logic"
```

---

## Task 9: Integrate All Changes into fetchAndEnrichBalances

**Files:**
- Modify: `src/services/balances/balance-service.ts`

**Step 1: Update constructor to include tokenHoldingRepository**

```typescript
// src/services/balances/balance-service.ts - update constructor
constructor(
  private readonly addressRepository: AddressRepository,
  private readonly tokenRepository: TokenRepository,
  private readonly tokenHoldingRepository: TokenHoldingRepository,
  private readonly pricingService: PricingService,
  private readonly fetcherFactory: (chainAlias: ChainAlias, network: string) => BalanceFetcher | null,
  config: BalanceServiceConfig = {},
  private readonly spamClassificationService?: SpamClassificationService
) {
  this.currency = config.currency ?? 'usd';
}
```

**Step 2: Update fetchAndEnrichBalances to include options, spam fields, caching, filtering, and sorting**

The implementation is extensive - update the method to:
1. Pass options through from getBalancesByChainAndAddress
2. Build holdingsMap from cached holdings for fallback lookup
3. Fetch balances with fallback per token
4. Upsert successful fetches to cache
5. Compute spam fields (isSpam, userSpamOverride, effectiveSpamStatus)
6. Apply spam filter based on options.showSpam
7. Apply sorting based on options.sortBy/sortOrder
8. Return filtered and sorted results

**Step 3: Run tests**

Run: `npm run test:unit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/services/balances/balance-service.ts
git commit -m "feat(service): integrate caching, spam filtering, and sorting"
```

---

## Task 10: Update Handler to Pass New Parameters

**Files:**
- Modify: `src/routes/balances/handlers.ts:127-195`

**Step 1: Update getTokenBalances handler**

```typescript
// src/routes/balances/handlers.ts - update getTokenBalances
export async function getTokenBalances(
  request: FastifyRequest<{
    Params: TokenBalancePathParams;
    Querystring: TokenBalanceQuery;
  }>,
  reply: FastifyReply
) {
  const { chainAlias, address } = request.params;
  const { cursor, limit, showHiddenTokens, showSpam, sortBy, sortOrder } = request.query;

  if (!request.server.services?.balances) {
    throw new InternalServerError('Balance service not available');
  }

  try {
    const balances = await request.server.services.balances.getBalancesByChainAndAddress(
      chainAlias,
      address,
      {
        includeHidden: showHiddenTokens,
        showSpam,
        sortBy,
        sortOrder,
      }
    );

    // Transform EnrichedBalance[] to response format
    const allData = balances.map((b) => ({
      name: b.name,
      balance: b.formattedBalance,
      symbol: b.symbol,
      decimals: b.decimals,
      address: b.isNative ? 'native' : (b.tokenAddress ?? ''),
      usdValue: b.usdValue?.toFixed(2) ?? null,
      logo: b.logoUri,
      // Spam fields
      isSpam: b.isSpam,
      userSpamOverride: b.userSpamOverride,
      effectiveSpamStatus: b.effectiveSpamStatus,
    }));

    // Apply cursor-based pagination
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = allData.findIndex((item) => item.address === cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginatedData = allData.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < allData.length;
    const lastItem = paginatedData[paginatedData.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem.address : null;

    return reply.send({
      data: paginatedData,
      lastUpdated: new Date().toISOString(),
      pagination: {
        nextCursor,
        hasMore,
        total: allData.length,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.critical('Error retrieving token balances', {
      error,
      params: { pathParameters: request.params },
    });
    throw error;
  }
}
```

**Step 2: Run tests**

Run: `npm run test:unit -- tests/unit/routes/balances/balances.test.ts`
Expected: PASS (tests from Task 2 should now pass)

**Step 3: Commit**

```bash
git add src/routes/balances/handlers.ts
git commit -m "feat(handler): pass new params and include spam fields in response"
```

---

## Task 11: Update Tests

**Files:**
- Modify: `tests/unit/routes/balances/balances.test.ts`

**Step 1: Update mock data to include spam fields**

```typescript
// tests/unit/routes/balances/balances.test.ts - update mockEnrichedBalances
const mockEnrichedBalances = [
  {
    tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    formattedBalance: '1000.00',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    usdValue: 1000.0,
    logoUri: 'https://example.com/usdc.png',
    isNative: false,
    isSpam: false,
    userSpamOverride: null,
    effectiveSpamStatus: 'unknown',
  },
  {
    tokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    formattedBalance: '500.00',
    symbol: 'USDT',
    decimals: 6,
    name: 'Tether USD',
    usdValue: 500.0,
    logoUri: 'https://example.com/usdt.png',
    isNative: false,
    isSpam: false,
    userSpamOverride: null,
    effectiveSpamStatus: 'unknown',
  },
];
```

**Step 2: Add test for spam filtering**

```typescript
it('filters spam tokens by default', async () => {
  const app = await createTestApp();

  const balancesWithSpam = [
    ...mockEnrichedBalances,
    {
      tokenAddress: '0xspam',
      formattedBalance: '1000000',
      symbol: 'SCAM',
      decimals: 18,
      name: 'Scam Token',
      usdValue: null,
      logoUri: null,
      isNative: false,
      isSpam: true,
      userSpamOverride: null,
      effectiveSpamStatus: 'spam',
    },
  ];

  mockGetBalancesByChainAndAddress.mockResolvedValueOnce(balancesWithSpam);

  const response = await app.inject({
    method: 'GET',
    url: `/v2/balances/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/tokens`,
  });

  expect(response.statusCode).toBe(200);
  const data = response.json();
  // Spam token should be filtered out by the service
  expect(mockGetBalancesByChainAndAddress).toHaveBeenCalledWith(
    'eth',
    TEST_ADDRESS,
    expect.objectContaining({ showSpam: false })
  );
});

it('includes spam fields in response', async () => {
  const app = await createTestApp();
  mockGetBalancesByChainAndAddress.mockResolvedValueOnce(mockEnrichedBalances);

  const response = await app.inject({
    method: 'GET',
    url: `/v2/balances/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/tokens`,
  });

  expect(response.statusCode).toBe(200);
  const data = response.json();
  expect(data.data[0]).toHaveProperty('isSpam');
  expect(data.data[0]).toHaveProperty('userSpamOverride');
  expect(data.data[0]).toHaveProperty('effectiveSpamStatus');
});
```

**Step 3: Run all balance tests**

Run: `npm run test:unit -- tests/unit/routes/balances/balances.test.ts`
Expected: All PASS

**Step 4: Commit**

```bash
git add tests/unit/routes/balances/balances.test.ts
git commit -m "test: update balance tests for spam filtering and new response fields"
```

---

## Verification

### Run all unit tests
```bash
npm run test:unit -- tests/unit/routes/balances
npm run test:unit -- tests/unit/services/balances
```

### Manual API Testing

```bash
# Default behavior (showSpam=false, sortBy=usdValue, sortOrder=desc, limit=20)
GET /v2/balances/ecosystem/evm/chain/polygon/address/0x.../tokens

# Include spam tokens
GET /v2/balances/ecosystem/evm/chain/polygon/address/0x.../tokens?showSpam=true

# Custom sorting
GET /v2/balances/ecosystem/evm/chain/polygon/address/0x.../tokens?sortBy=symbol&sortOrder=asc

# Pagination
GET /v2/balances/ecosystem/evm/chain/polygon/address/0x.../tokens?limit=10&cursor=0x...
```

### Verify Caching Behavior

1. Check `token_holdings` table is updated after successful fetch
2. Simulate RPC failure and verify cached value is returned
3. Check logs for "Balance mismatch detected" warnings

### Verify Spam Filtering

1. Create token with `is_spam=true` in tokens table
2. Verify it's filtered out by default
3. Verify `showSpam=true` includes it
4. Verify `userSpamOverride='trusted'` overrides global spam status
