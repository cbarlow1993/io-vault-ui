# PostgreSQL Migration Design

Migration from DynamoDB/Noves to PostgreSQL with direct chain RPC balance fetching.

## Overview

| Component | Current | Target |
|-----------|---------|--------|
| Addresses | PostgreSQL + DynamoDB | PostgreSQL only |
| Transactions | DynamoDB + Noves reads | PostgreSQL (sync service writes) |
| Balances | Noves API | Direct RPC via iofinnet nodes |
| Token Metadata | DynamoDB cache | `tokens` table in PostgreSQL |
| Pricing | Noves (bundled) | CoinGecko + PostgreSQL cache |

## Key Decisions

- **Balance fetching**: Real-time on-demand from chain RPCs (iofinnet nodes)
- **USD pricing**: CoinGecko API with 60s PostgreSQL cache
- **Transaction sync**: Separate service (direct RPC for high-priority chains, Noves for others)
- **Rollout**: Big bang cutover (no feature flags)
- **Scope**: All schema additions from PR #78 review included

---

## Schema Additions

### 1. Modify `token_holdings` for native currencies

```typescript
export type TokenHoldingTable = {
  id: Unupdateable<string>;
  addressId: Unupdateable<string>;
  chain: Unupdateable<string>;
  network: Unupdateable<string>;
  tokenAddress: Unupdateable<string | null>; // null = native currency
  isNative: boolean; // true for ETH, SOL, BTC, etc.

  balance: string;
  decimals: number;
  name: string;
  symbol: string;
  visibility: TokenHoldingVisibility;

  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
};
```

### 2. New `tokens` metadata table

```typescript
export type TokenTable = {
  id: Unupdateable<string>;
  chain: Unupdateable<string>;
  network: Unupdateable<string>;
  address: Unupdateable<string>; // contract address, unique per chain/network

  name: string;
  symbol: string;
  decimals: number;
  logoUri: string | null;
  coingeckoId: string | null;
  isVerified: boolean;
  isSpam: boolean;

  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
};
```

### 3. New `token_prices` cache table

```typescript
export type TokenPriceTable = {
  id: Unupdateable<string>;
  coingeckoId: string;
  currency: string; // 'usd', 'eur', etc.

  price: string;
  priceChange24h: string | null;
  marketCap: string | null;

  fetchedAt: Date;
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
};
```

### 4. New `sync_state` table

```typescript
export type SyncStateTable = {
  id: Unupdateable<string>;
  addressId: Unupdateable<string>;
  chain: Unupdateable<string>;
  network: Unupdateable<string>;

  lastIndexedBlock: string;
  lastIndexedTxHash: string | null;
  lastIndexedAt: Date;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  errorMessage: string | null;
  retryCount: number;

  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
};
```

### 5. Add classification to `transactions`

```typescript
// Additional fields for TransactionTable
classificationType: string | null;  // 'send', 'receive', 'swap', etc.
classificationLabel: string | null; // "Sent 0.5 ETH to 0x..."
protocolName: string | null;        // 'Uniswap', 'Aave', etc.
```

### 6. Foreign Key Constraints

```sql
ALTER TABLE token_holdings
  ADD CONSTRAINT fk_token_holdings_address
  FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE CASCADE;

ALTER TABLE native_transfers
  ADD CONSTRAINT fk_native_transfers_tx
  FOREIGN KEY (tx_id) REFERENCES transactions(id) ON DELETE CASCADE;

ALTER TABLE token_transfers
  ADD CONSTRAINT fk_token_transfers_tx
  FOREIGN KEY (tx_id) REFERENCES transactions(id) ON DELETE CASCADE;

ALTER TABLE address_transactions
  ADD CONSTRAINT fk_address_transactions_tx
  FOREIGN KEY (tx_id) REFERENCES transactions(id) ON DELETE CASCADE;

ALTER TABLE sync_state
  ADD CONSTRAINT fk_sync_state_address
  FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE CASCADE;
```

### 7. Address Case Normalization

```sql
ALTER TABLE addresses
  ADD CONSTRAINT chk_address_lowercase
  CHECK (address = LOWER(address));

ALTER TABLE transactions
  ADD CONSTRAINT chk_from_address_lowercase
  CHECK (from_address = LOWER(from_address));

ALTER TABLE transactions
  ADD CONSTRAINT chk_to_address_lowercase
  CHECK (to_address IS NULL OR to_address = LOWER(to_address));
```

---

## Balance Service Architecture

### Flow

```
User Request -> API -> Balance Service -> iofinnet RPC -> Raw Balances
                            |                                  |
                     token_holdings              Pricing Service
                     (token list hint)                  |
                                                  CoinGecko API
                                                        |
                                                  token_prices cache
                                                        |
                                                Enriched Balances -> Response
```

### Balance Service Interface

```typescript
interface BalanceService {
  getBalances(addressId: string): Promise<Balance[]>;
  getNativeBalance(address: string, chain: string, network: string): Promise<NativeBalance>;
  getTokenBalance(address: string, token: TokenInfo): Promise<TokenBalance>;
}
```

### Chain-Specific Balance Fetchers

```typescript
EVMBalanceFetcher    -> eth_getBalance, multicall for ERC-20 balanceOf
SVMBalanceFetcher    -> getBalance, getTokenAccountsByOwner
UTXOBalanceFetcher   -> listunspent aggregation
TVMBalanceFetcher    -> getaccount, triggersmartcontract
XRPBalanceFetcher    -> account_info, account_lines
```

### Pricing Service

```typescript
interface PricingService {
  getPrices(coingeckoIds: string[], currency?: string): Promise<Map<string, TokenPrice>>;
  enrichWithPrices(balances: RawBalance[]): Promise<EnrichedBalance[]>;
}
```

Cache strategy:
- Check PostgreSQL `token_prices` table first
- If stale (>60s), fetch from CoinGecko
- Batch up to 250 IDs per CoinGecko request
- Fallback to stale price if CoinGecko fails (with `isStale` flag)

### RPC Client Configuration

```typescript
interface RpcClient {
  call<T>(method: string, params: unknown[]): Promise<T>;
}

// Timeouts & Retries
- 5s timeout per RPC call
- 1 retry with exponential backoff
- Circuit breaker per chain if multiple failures
```

### Error Handling

```typescript
// Graceful degradation per token
{
  address: "0x...",
  tokens: [
    { symbol: "USDC", balance: "1000.00", usdValue: "1000.00" },
    { symbol: "UNKNOWN", balance: null, error: "RPC_TIMEOUT" }
  ]
}
```

---

## Repository Layer

### New Repositories

```typescript
interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByTxHash(chain: string, network: string, txHash: string): Promise<Transaction | null>;
  findByAddress(address: string, options?: PaginationOptions): Promise<PaginatedResult<Transaction>>;
}

interface TokenRepository {
  findByChainAndAddress(chain: string, network: string, address: string): Promise<Token | null>;
  findVerifiedByChain(chain: string, network: string): Promise<Token[]>;
  upsert(token: TokenInsert): Promise<Token>;
}

interface TokenHoldingRepository {
  findByAddressId(addressId: string): Promise<TokenHolding[]>;
  upsertHolding(holding: TokenHoldingInsert): Promise<TokenHolding>;
}

interface TokenPriceRepository {
  findByCoingeckoIds(ids: string[], currency: string): Promise<TokenPrice[]>;
  upsertPrices(prices: TokenPriceInsert[]): Promise<void>;
}
```

---

## Service Layer Changes

### New Structure

```
services/
  addresses/
    postgres-service.ts     # Keep (already migrated)
  balances/
    balance-service.ts      # NEW: orchestrates balance fetching
    pricing-service.ts      # NEW: CoinGecko + cache
    fetchers/
      evm.ts               # NEW: eth_getBalance, multicall
      svm.ts               # NEW: Solana RPC
      utxo.ts              # NEW: Bitcoin RPC
      tvm.ts               # NEW: Tron RPC
      xrp.ts               # NEW: XRP RPC
  transactions/
    postgres-service.ts     # NEW: reads from PostgreSQL
```

### Files to Delete

```
services/addresses/ddb.ts
services/addresses/index.ts (DynamoDB version)
services/addresses/keys.ts
services/addresses/formatter.ts
services/transactions/ddb.ts
services/transactions/noves.ts
services/transactions/keys.ts
services/balances/noves.ts
services/balances/metadata/ddb.ts
lib/clients.ts (Noves client exports)
```

---

## API Route Handler Changes

### Balance Routes

```typescript
// BEFORE
const balances = await novesClient.getTokenBalances(address, chain);

// AFTER
export async function getBalances(request, reply) {
  const { addressId } = request.params;
  const address = await services.addresses.getAddressById(addressId);
  const rawBalances = await services.balances.getBalances(address);
  const enrichedBalances = await services.pricing.enrichWithPrices(rawBalances);
  return enrichedBalances;
}
```

### Transaction Routes

```typescript
// BEFORE
const transactions = await novesClient.listTransactions(address);

// AFTER
export async function listTransactions(request, reply) {
  const { addressId } = request.params;
  const { cursor, limit } = request.query;
  const result = await services.transactions.listByAddressId(addressId, { cursor, limit });
  return { transactions: result.data, pagination: result.pagination };
}
```

### Removed Endpoints

- `POST /transactions` - Sync service responsibility
- `POST /transactions/sync` - Sync service responsibility

---

## Configuration Changes

### Remove

```typescript
database: {
  addressesTable: string;      // DELETE
  transactionsTable: string;   // DELETE
  tokenMetadataTable: string;  // DELETE
}

apis: {
  noves: { ... }               // DELETE (moves to sync service)
}
```

### Add

```typescript
apis: {
  coingecko: {
    apiKey: string;
    baseUrl: string;
    cacheTtlSeconds: number;   // Default: 60
  },
  rpc: {
    timeoutMs: number;         // Default: 5000
    retryCount: number;        // Default: 1
  }
}
```

### Environment Variables

```bash
# REMOVE
ADDRESSES_TABLE=
TRANSACTIONS_TABLE=
TOKEN_METADATA_TABLE=
NOVES_API_KEY=

# KEEP
DB_POSTGRES_*=
COINGECKO_API_KEY=
```

### Dependencies to Remove

```json
"@aws-sdk/client-dynamodb": "...",
"@aws-sdk/lib-dynamodb": "...",
"@noves/noves-sdk": "..."
```

---

## Implementation Order

### Phase 1: Schema & Infrastructure
1. Create database migration with all new tables
2. Run migration on dev environment
3. Add new repository interfaces and implementations
4. Add new type definitions

### Phase 2: Balance Service
5. Implement RPC client factory for iofinnet nodes
6. Implement chain-specific balance fetchers (EVM, SVM, UTXO, TVM, XRP)
7. Implement pricing service with CoinGecko + cache
8. Implement orchestrating balance service
9. Update balance route handlers

### Phase 3: Transaction Service
10. Implement transaction repository (PostgreSQL reads)
11. Implement transaction service
12. Update transaction route handlers
13. Remove write endpoints (moved to sync service)

### Phase 4: Cleanup
14. Remove DynamoDB address code
15. Remove Noves integration
16. Remove DynamoDB dependencies from package.json
17. Update configuration
18. Clean up unused types

### Phase 5: Testing & Validation
19. Unit tests for new repositories
20. Unit tests for balance fetchers
21. Integration tests for balance endpoints
22. Integration tests for transaction endpoints
23. E2E validation on staging

### Parallel Workstream (Sync Service)
- Separate repo/service handles transaction indexing
- Consumes Noves (low priority chains) or direct RPC (high priority chains)
- Writes to same PostgreSQL database

---

## Database Migration SQL

```sql
-- tokens table
CREATE TABLE tokens (
  id UUID PRIMARY KEY,
  chain VARCHAR(50) NOT NULL,
  network VARCHAR(50) NOT NULL,
  address VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  decimals INTEGER NOT NULL,
  logo_uri TEXT,
  coingecko_id VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  is_spam BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (chain, network, address)
);

-- token_prices table
CREATE TABLE token_prices (
  id UUID PRIMARY KEY,
  coingecko_id VARCHAR(255) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  price DECIMAL(30,10) NOT NULL,
  price_change_24h DECIMAL(10,4),
  market_cap DECIMAL(30,2),
  fetched_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (coingecko_id, currency)
);

-- sync_state table
CREATE TABLE sync_state (
  id UUID PRIMARY KEY,
  address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
  chain VARCHAR(50) NOT NULL,
  network VARCHAR(50) NOT NULL,
  last_indexed_block VARCHAR(100) NOT NULL,
  last_indexed_tx_hash VARCHAR(255),
  last_indexed_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'syncing', 'synced', 'error')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (address_id, chain, network)
);

-- Indexes
CREATE INDEX idx_tokens_chain ON tokens(chain, network);
CREATE INDEX idx_tokens_coingecko ON tokens(coingecko_id) WHERE coingecko_id IS NOT NULL;
CREATE INDEX idx_token_prices_fetched ON token_prices(fetched_at);
CREATE INDEX idx_sync_state_status ON sync_state(status);
```
