# Legacy Tokens Endpoint Migration to BalanceService

## Overview

Migrate the legacy `/tokens` endpoint from using external token discovery to a database-first approach using `BalanceService`.

## Current State

The legacy endpoint `GET /ecosystem/:ecosystem/chain/:chain/address/:address/tokens`:
- Uses `tokenBalanceFetchers` to discover tokens from external providers
- Has complex inline CoinGecko/pricing logic
- ~260 lines of handler code

## Target State

- Extend `BalanceService` with `getBalancesByChainAndAddress(chain, walletAddress)`
- Simplify handler to ~30 lines
- Database-first: tokens come from `token_holdings` table
- Backwards compatible response format

## Design

### New BalanceService Method

```typescript
async getBalancesByChainAndAddress(
  chain: string,
  walletAddress: string,
  options?: { includeHidden?: boolean }
): Promise<EnrichedBalance[]>
```

**Flow:**
1. Query `addressRepository.findByAddressAndChain(walletAddress, chain)`
2. If not found → throw `NotFoundError`
3. Get token holdings via `tokenHoldingRepository`
4. Enrich with metadata from `tokenRepository` (coingeckoId, logoUri)
5. Fetch balances via RPC
6. Fetch prices via `pricingService`
7. Return `EnrichedBalance[]`

### Handler Migration

Transform BalanceService output to legacy format:
```json
{
  "data": [
    { "name": "POL", "balance": "1.5", "symbol": "POL", "decimals": 18, "address": "POL", "usdValue": "0.75", "logo": "..." }
  ],
  "lastUpdated": "..."
}
```

### Data Flow

```
GET /ecosystem/evm/chain/polygon/address/0x.../tokens
    │
    ▼
Handler: getTokenBalances()
    │
    ▼
BalanceService.getBalancesByChainAndAddress()
  1. addressRepository.findByAddressAndChain()
  2. tokenHoldingRepository.findVisibleByAddressId()
  3. tokenRepository.findVerifiedByChain()
  4. fetcher.getNativeBalance() + getTokenBalances()
  5. pricingService.getPrices()
    │
    ▼
Response (legacy format)
```

### Error Handling

| Scenario | Behavior |
|----------|----------|
| Address not in DB | 404 NotFoundError |
| Address exists, no token holdings | Return `{ data: [], lastUpdated }` |
| RPC fetcher unavailable | 500 InternalServerError |
| RPC call fails | Log error, return partial results |
| PricingService fails | Return balances with `usdValue: null` |

### Edge Cases

| Case | Handling |
|------|----------|
| Native token only | Always included if balance > 0 |
| Zero balance tokens | Filtered out |
| `showHiddenTokens=true` | Include hidden tokens |

## Implementation

### Files Changed

| File | Change |
|------|--------|
| `services/balances/balance-service.ts` | Add new method |
| `routes/balances/handlers.ts` | Simplify handler |
| `services/balances/index.ts` | Remove `evmBalanceFetcher` |

### Implementation Order

1. Add `getBalancesByChainAndAddress()` to BalanceService
2. Refactor shared logic into private helper
3. Update legacy handler
4. Remove unused code
