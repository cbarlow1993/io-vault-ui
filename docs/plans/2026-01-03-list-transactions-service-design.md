# List Transactions Service Design

## Overview

Implement a PostgreSQL-backed `listTransactions` service that queries transactions by chain and address with cursor-based pagination.

## Decisions

| Aspect | Decision |
|--------|----------|
| Query approach | `address_transactions` join table for lists, direct `transactions` table for single lookups |
| Pagination | Cursor-based using base64-encoded `timestamp:txId` |
| Response format | Configurable `include` options for native/token transfers |
| Transfer fetching | Batch query after main results using `tx_id IN (...)` |
| Sort order | Default `desc` (newest first), configurable to `asc` |
| Network resolution | Derive from chain via existing `ChainAlias` mappings |
| Error handling | 404 for unknown address, empty array for known address with no transactions |

## Service Interface

```typescript
// services/transactions/postgres-service.ts

interface ListTransactionsOptions {
  chain: string;
  address: string;
  cursor?: string;           // encoded timestamp:txId
  limit?: number;            // default 50, max 100
  sort?: 'asc' | 'desc';     // default 'desc'
  include?: {
    nativeTransfers?: boolean;
    tokenTransfers?: boolean;
  };
}

interface ListTransactionsResult {
  transactions: Transaction[];
  pagination: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor: string | null;
    previousCursor: string | null;
  };
}
```

## Repository Interface

```typescript
// repositories/types.ts

interface TransactionRepository {
  // Existing
  findById(id: string): Promise<Transaction | null>;
  findByTxHash(chain: string, network: string, txHash: string): Promise<Transaction | null>;

  // New - cursor-based with join table
  findByChainAndAddress(
    chain: string,
    network: string,
    address: string,
    options: {
      cursor?: { timestamp: Date; txId: string };
      limit: number;
      sort: 'asc' | 'desc';
    }
  ): Promise<{
    data: Transaction[];
    hasMore: boolean;
  }>;

  // Transfer batch fetching
  findNativeTransfersByTxIds(txIds: string[]): Promise<NativeTransfer[]>;
  findTokenTransfersByTxIds(txIds: string[]): Promise<TokenTransfer[]>;
}
```

## Query Implementation

```typescript
// repositories/transaction-repository.ts

async findByChainAndAddress(chain, network, address, options) {
  const { cursor, limit, sort } = options;
  const direction = sort === 'asc' ? 'asc' : 'desc';
  const comparator = sort === 'asc' ? '>' : '<';

  let query = db
    .selectFrom('address_transactions as at')
    .innerJoin('transactions as t', 't.id', 'at.tx_id')
    .select([/* transaction columns */])
    .where('at.address', '=', address.toLowerCase())
    .where('at.chain', '=', chain)
    .where('at.network', '=', network)
    .orderBy('at.timestamp', direction)
    .orderBy('at.tx_id', direction)
    .limit(limit + 1);  // +1 to detect hasMore

  if (cursor) {
    // Composite cursor comparison for stable pagination
    query = query.where(
      sql`(at.timestamp, at.tx_id) ${comparator} (${cursor.timestamp}, ${cursor.txId})`
    );
  }

  const rows = await query.execute();
  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);

  return { data, hasMore };
}
```

## Cursor Encoding

```typescript
// services/transactions/cursor.ts

interface CursorData {
  ts: number;   // Unix timestamp in ms
  id: string;   // Transaction UUID
}

function encodeCursor(timestamp: Date, txId: string): string {
  const data: CursorData = { ts: timestamp.getTime(), id: txId };
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function decodeCursor(cursor: string): { timestamp: Date; txId: string } {
  const data: CursorData = JSON.parse(Buffer.from(cursor, 'base64url').toString());
  return { timestamp: new Date(data.ts), txId: data.id };
}
```

## Chain Resolution

```typescript
// services/transactions/chain-resolver.ts

import { Chain, ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

interface ChainNetwork {
  chain: string;
  network: string;
}

async function resolveChainNetwork(chainAlias: string): Promise<ChainNetwork> {
  const chain = await Chain.fromAlias(chainAlias as ChainAlias);
  return {
    chain: chain.name.toLowerCase(),
    network: chain.network.toLowerCase(),
  };
}
```

## Address Validation

```typescript
// In PostgresTransactionService.listByChainAndAddress()

async listByChainAndAddress(options: ListTransactionsOptions) {
  const { chain, network } = await resolveChainNetwork(options.chain);

  // Check if address exists in our system
  const addressExists = await this.addressRepository.findByAddressAndChain(
    options.address.toLowerCase(),
    options.chain
  );

  if (!addressExists) {
    throw new NotFoundError(`Address ${options.address} not found for chain ${options.chain}`);
  }

  // Proceed with transaction query...
}
```

## File Structure

```
services/core/src/
├── repositories/
│   ├── types.ts                    # Extend TransactionRepository interface
│   └── transaction-repository.ts   # New file - Kysely implementation
├── services/transactions/
│   ├── postgres-service.ts         # Extend with listByChainAndAddress
│   ├── cursor.ts                   # New file - cursor encode/decode
│   └── chain-resolver.ts           # New file - chain→network mapping
└── routes/transactions/
    └── handlers.ts                 # Update to use new service method
```

## Dependencies

```typescript
// services/transactions/postgres-service.ts

export interface TransactionServiceDeps {
  transactionRepository: TransactionRepository;
  addressRepository: AddressRepository;  // for address validation
}

export class PostgresTransactionService {
  constructor(private deps: TransactionServiceDeps) {}

  async listByChainAndAddress(options: ListTransactionsOptions): Promise<ListTransactionsResult> {
    // Implementation
  }
}
```

## Implementation Steps

1. Create `cursor.ts` with encode/decode functions
2. Create `chain-resolver.ts` with chain-to-network mapping
3. Extend `TransactionRepository` interface in `types.ts`
4. Implement `transaction-repository.ts` with Kysely queries
5. Extend `PostgresTransactionService` with `listByChainAndAddress`
6. Update route handlers to use new service method
7. Add unit tests for cursor encoding and repository queries
8. Add integration tests for end-to-end flow
