# Token Spam Filtering Design

## Overview

Comprehensive spam management system for token assets covering airdrop spam, known scam tokens, and suspicious tokens. The system flags tokens with detailed classification data, allowing the frontend to decide how to display them.

## Goals

- Detect and flag spam/scam tokens using multiple data sources
- Provide transparent, categorical classification flags per source
- Allow users to override classifications (trust or mark as spam)
- Cache classifications with background refresh for performance
- Never auto-hide tokens - always include with flags, let frontend decide

## Non-Goals

- Automatic low-value token filtering (users can manually hide)
- Blocking transactions involving spam tokens
- Real-time transaction simulation (already handled separately)

---

## Data Model

### Global Token Classifications

Extend the `tokens` table:

```sql
ALTER TABLE tokens ADD COLUMN spam_classification JSONB DEFAULT NULL;
ALTER TABLE tokens ADD COLUMN classification_updated_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE tokens ADD COLUMN classification_ttl_hours INT DEFAULT 24;
```

The `spam_classification` JSON structure:

```typescript
interface SpamClassification {
  blockaid: {
    isMalicious: boolean;
    isPhishing: boolean;
    riskScore: number | null;  // 0-1 if available
    attackTypes: string[];     // e.g., ["honeypot", "rug_pull"]
    checkedAt: string;
  } | null;
  coingecko: {
    isListed: boolean;
    marketCapRank: number | null;
  };
  heuristics: {
    suspiciousName: boolean;
    namePatterns: string[];      // e.g., ["contains_url", "unicode_tricks"]
    isUnsolicited: boolean;      // airdrop detection
    contractAgeDays: number | null;
    isNewContract: boolean;      // < 7 days
    holderDistribution: 'normal' | 'suspicious' | 'unknown';
  };
}
```

### User Overrides

Extend the `token_holdings` table:

```sql
ALTER TABLE token_holdings ADD COLUMN user_spam_override VARCHAR(20) DEFAULT NULL;
-- Values: 'trusted', 'spam', NULL (use global)
ALTER TABLE token_holdings ADD COLUMN override_updated_at TIMESTAMPTZ DEFAULT NULL;
```

---

## Service Architecture

### Directory Structure

```
services/core/src/services/spam/
├── spam-classification-service.ts   # Main orchestrator
├── providers/
│   ├── types.ts                     # Shared interfaces
│   ├── blockaid-provider.ts         # Blockaid Token Security API
│   ├── coingecko-provider.ts        # CoinGecko listing check
│   └── heuristics-provider.ts       # Internal rule engine
├── heuristics/
│   ├── name-analyzer.ts             # Suspicious name/symbol detection
│   ├── airdrop-detector.ts          # Unsolicited transfer detection
│   ├── contract-age-checker.ts      # Contract deployment age
│   └── holder-analyzer.ts           # Distribution pattern analysis
└── index.ts
```

### SpamClassificationService

Main orchestrator responsibilities:
- Orchestrate calls to all providers (parallel where possible)
- Aggregate results into unified `spam_classification` structure
- Handle caching logic (check TTL, return cached or fetch fresh)
- Expose `classifyToken(chain, network, tokenAddress)` and `classifyTokensBatch(tokens[])` methods

### Provider Implementations

#### BlockaidProvider

```typescript
interface BlockaidTokenResult {
  isMalicious: boolean;
  isPhishing: boolean;
  riskScore: number | null;
  attackTypes: string[];
}
```

- Calls Blockaid Token Security API
- Batches requests where possible to reduce API calls
- Falls back gracefully if Blockaid unavailable (returns `null` classification)
- Caches results aggressively since token security status rarely changes

#### CoingeckoProvider

- Leverages existing `PricingService` data - if we have a `coingecko_id`, token is listed
- Enriches with `market_cap_rank` from price data when available
- No additional API calls needed for most tokens

#### HeuristicsProvider

Aggregates sub-analyzers:

| Analyzer | Logic |
|----------|-------|
| `NameAnalyzer` | Regex patterns for URLs, unicode confusables, known scam phrases, impersonation of top tokens |
| `AirdropDetector` | Query transaction history - flag if token appeared without user-initiated tx |
| `ContractAgeChecker` | Fetch contract creation block, calculate age (requires archive node or explorer API) |
| `HolderAnalyzer` | Call explorer API for holder stats, flag if top 10 holders own >90% |

---

## Integration with BalanceService

After fetching raw balances:
1. Call `SpamClassificationService.classifyTokensBatch()` for all tokens
2. Merge classification results into `EnrichedBalance` response
3. Fetch user overrides from `token_holdings`
4. Include full `spamAnalysis` object in response

---

## API Response Format

Extended `EnrichedBalance` response:

```typescript
interface EnrichedBalance {
  // Existing fields
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
  logoUri: string | null;

  // New spam analysis section
  spamAnalysis: {
    blockaid: {
      isMalicious: boolean;
      isPhishing: boolean;
      riskScore: number | null;
      attackTypes: string[];
      checkedAt: string;
    } | null;
    coingecko: {
      isListed: boolean;
      marketCapRank: number | null;
    };
    heuristics: {
      suspiciousName: boolean;
      namePatterns: string[];
      isUnsolicited: boolean;
      contractAgeDays: number | null;
      isNewContract: boolean;
      holderDistribution: 'normal' | 'suspicious' | 'unknown';
    };
    userOverride: 'trusted' | 'spam' | null;
    classificationUpdatedAt: string;
    summary: {
      riskLevel: 'safe' | 'warning' | 'danger';
      reasons: string[];
    };
  };
}
```

The `summary` field is computed at response time from all signals, providing a convenient rollup for simple frontend use cases.

---

## User Override API

### Endpoints

```
PATCH  /addresses/:addressId/tokens/:tokenAddress/spam-override
DELETE /addresses/:addressId/tokens/:tokenAddress/spam-override
```

### PATCH Request Body

```typescript
{
  override: 'trusted' | 'spam'
}
```

### Response

```typescript
{
  tokenAddress: string;
  chain: string;
  network: string;
  userOverride: 'trusted' | 'spam';
  updatedAt: string;
}
```

### Bulk Endpoint

```
PATCH /addresses/:addressId/tokens/spam-overrides
Body: { overrides: [{ tokenAddress: string, override: 'trusted' | 'spam' }] }
```

### Authorization

- User must own the address (validated via existing auth middleware)
- Override only affects that user's view of the token for that specific address

---

## Background Classification Worker

### Responsibilities

- Runs on configurable schedule (e.g., every 15 minutes)
- Queries tokens with expired classifications (`classification_updated_at + ttl < now`)
- Prioritizes tokens by:
  1. Tokens held by active users (recent balance queries)
  2. Tokens with higher total USD value across all holders
  3. Recently discovered tokens (never classified)

### Worker Flow

```
1. Fetch batch of tokens needing classification (limit 100)
2. Group by chain/network for efficient batching
3. Call SpamClassificationService.classifyTokensBatch()
4. Update tokens table with new classifications
5. Log metrics (tokens processed, spam detected, errors)
6. Repeat until queue empty or time budget exhausted
```

### On-Demand Fallback

- If `BalanceService` encounters token with no classification (or expired), triggers immediate classification
- Returns cached stale data with `isStale: true` flag while background refresh happens
- Ensures user never waits for full classification on first request

---

## Testing Approach

### Unit Tests

| Component | Test Focus |
|-----------|------------|
| `NameAnalyzer` | Pattern matching: URLs, unicode tricks, impersonation (e.g., "USDC" vs "USÐC") |
| `AirdropDetector` | Transaction history parsing, unsolicited transfer identification |
| `ContractAgeChecker` | Age calculation, threshold logic |
| `HolderAnalyzer` | Distribution scoring, edge cases (single holder, many holders) |
| `SpamClassificationService` | Provider orchestration, caching logic, TTL expiry |

### Integration Tests

```typescript
describe('SpamClassificationService', () => {
  it('returns cached classification within TTL');
  it('fetches fresh classification when TTL expired');
  it('handles Blockaid API failure gracefully');
  it('aggregates all provider results correctly');
  it('respects user override over global classification');
});

describe('Balance API with spam analysis', () => {
  it('includes spamAnalysis in enriched balance response');
  it('applies user trusted override to flagged token');
  it('applies user spam override to safe token');
});
```

### Test Fixtures

- Known spam token addresses (real examples from testnets)
- Suspicious name patterns corpus
- Mock Blockaid responses for various risk levels

### E2E Tests

- Full flow: new token appears → classification triggered → response includes flags
- User override flow: mark as trusted → verify flag in subsequent balance queries

---

## Open Questions

1. **Blockaid Token Security API** - Confirm endpoint availability and rate limits with current subscription
2. **Contract age data source** - Use archive node RPC or explorer API (Etherscan, etc.)?
3. **Holder distribution data source** - Which explorer APIs support holder stats per chain?

---

## Future Considerations

- Community-reported spam tokens (crowdsourced flagging)
- Machine learning model trained on spam token patterns
- Integration with additional security providers (GoPlus, Token Sniffer)
- Proactive alerting when user receives known spam token
