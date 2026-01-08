# Get Transaction V2 Endpoint Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a v2 getTransaction endpoint that reads from PostgreSQL instead of external services.

**Architecture:** V2 endpoint uses PostgresTransactionService to fetch transaction data with transfers, while v1 remains unchanged using Noves/chain explorers.

**Tech Stack:** Fastify, Zod, PostgreSQL (Kysely), existing getTagAssignment for future operation support.

---

## Endpoint Structure

**V1 Endpoint (unchanged):**
```
GET /v2/transactions/ecosystem/:ecosystem/chain/:chain/address/:address/transaction/:transactionHash?include=operation
```
- Continues using Noves/chain explorers
- Optional `?include=operation` for operation linkage
- Returns legacy format

**V2 Endpoint (new):**
```
GET /v2/transactions/ecosystem/:ecosystem/chain/:chain/address/:address/transaction/:transactionHash?include=operation
```
- Fetches from PostgreSQL
- Always includes `nativeTransfers` and `tokenTransfers` arrays
- `?include=operation` accepted but stubbed (TODO: implement operation resolution)
- Returns PostgreSQL format

---

## Data Flow

**V2 Handler Flow:**
1. Validate path params (ecosystem, chain, address, transactionHash)
2. Resolve chain alias to chain+network via `resolveChainNetwork()`
3. Call `PostgresTransactionService.getByChainAndHash()` (new method)
   - Fetches transaction from `transactions` table
   - Fetches `nativeTransfers` and `tokenTransfers` in parallel
   - Returns combined result or throws `NotFoundError`
4. If `?include=operation`, log TODO warning (stubbed for now)
5. Return response with transaction + transfers + `operationId: null`

**New Service Method:**
```typescript
// In PostgresTransactionService
async getByChainAndHash(options: {
  chain: string;      // chain alias like 'eth'
  txHash: string;
}): Promise<TransactionWithTransfers & { operationId: null }>
```

---

## Response Schema

**V2 Response Format:**
```typescript
{
  id: string;
  chain: string;
  network: string;
  txHash: string;
  blockNumber: string;
  blockHash: string;
  txIndex: number | null;
  fromAddress: string;
  toAddress: string | null;
  value: string;
  fee: string | null;
  status: 'success' | 'failed' | 'pending';
  timestamp: Date;
  classificationType: string | null;
  classificationLabel: string | null;
  protocolName: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  nativeTransfers: NativeTransfer[];
  tokenTransfers: TokenTransfer[];
  operationId: null;  // TODO: implement operation resolution
}
```

---

## Error Handling

| Scenario | Response |
|----------|----------|
| Transaction not found | 404 NotFoundError |
| Invalid chain alias | 400 UserInputError (from chain resolver) |
| Invalid ecosystem | 400 (Zod validation) |
| Database error | 500 InternalServerError |

---

## File Changes

**Files to modify:**
- `src/routes/transactions/handlers.ts` - Add `getTransactionDetailsV2` handler
- `src/routes/transactions/index.ts` - Register v2 route
- `src/routes/transactions/schemas.ts` - Add v2 response schema with required `operationId: null`
- `src/services/transactions/postgres-service.ts` - Add `getByChainAndHash()` method

**Files to create:**
- `tests/unit/routes/transactions/get-transaction-v2.test.ts` - Unit tests

---

## Test Coverage

- Returns transaction with transfers for valid hash
- Returns 404 when transaction not found
- Returns 404 when chain not supported
- Validates path parameters
- Stubs operationId as null (with TODO marker)

---

## Future Work

- Implement `?include=operation` to resolve full operation object via `getTagAssignment` and operation fetching
