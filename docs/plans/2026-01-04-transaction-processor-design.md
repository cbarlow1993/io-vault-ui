# Transaction Processor Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A chain-agnostic transaction parsing and classification service that upserts transactions and tokens to PostgreSQL, with custom classification logic and Noves fallback.

**Architecture:** TransactionProcessor orchestrates ChainFetcher (EVM/SVM), Classifier (custom + Noves fallback), and Upserter (transactions + tokens). Designed for reconciliation worker consumption now, future API indexing later.

**Tech Stack:** Fastify, Kysely, TypeScript, CoinGecko API, EVM/SVM RPC.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  TransactionProcessor                        │
│  (Orchestrator - takes tx hash, returns parsed result)       │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  ChainFetcher   │  │  Classifier     │  │  Upserter       │
│  (EVM/SVM)      │  │  (Custom+Noves) │  │  (Tx + Tokens)  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Data Flow:**
1. `TransactionProcessor.process(chain, txHash)` called
2. `ChainFetcher` retrieves raw transaction + receipt from RPC
3. `Classifier` parses and classifies (custom first, Noves fallback)
4. `Upserter` saves transaction, transfers, and upserts unknown tokens

**Consumers:**
- Reconciliation worker (current)
- Future indexing API endpoint

---

## Classifier Design

**Interface:** Chain-agnostic input/output with ecosystem-specific implementations.

```typescript
// Unified classification result
interface ClassificationResult {
  type: ClassificationType;  // 'transfer' | 'swap' | 'bridge' | 'stake' | etc.
  confidence: 'high' | 'medium' | 'low';
  source: 'custom' | 'noves';
  label: string;             // Human-readable: "Swap ETH for USDC"
  protocol?: string;         // "uniswap_v3", "jupiter", etc.
  transfers: ParsedTransfer[];
}

interface ParsedTransfer {
  type: 'native' | 'token' | 'nft';
  direction: 'in' | 'out';
  from: string;
  to: string;
  amount: string;
  token?: TokenInfo;  // For upsert
}
```

**Classification Types:**

| Type | EVM Detection | SVM Detection |
|------|---------------|---------------|
| `transfer` | Simple ETH/token send, no logs | SOL transfer, SPL transfer |
| `swap` | DEX router addresses + Swap events | Jupiter/Raydium program IDs |
| `bridge` | Known bridge contracts (Wormhole, etc.) | Wormhole program |
| `approve` | Approval event, no transfer | N/A (SVM has no approve) |
| `stake` | Staking contract interactions | Stake program instructions |
| `mint` | Transfer from zero address | Token mint instruction |
| `burn` | Transfer to zero address | Token burn instruction |
| `nft_transfer` | ERC721/1155 Transfer events | Metaplex transfer |
| `contract_deploy` | tx.to === null | Program deploy |

**Fallback Logic:**
```typescript
const result = await customClassifier.classify(tx);
if (result.type === 'unknown' || result.confidence === 'low') {
  return await novesClassifier.classify(tx);
}
return result;
```

---

## Upserter Design

**Responsibilities:** Atomic upsert of transaction data + token metadata discovery.

```typescript
interface TransactionUpserter {
  upsert(data: ClassificationResult, rawTx: RawTransaction): Promise<UpsertResult>;
}

interface UpsertResult {
  transactionId: string;
  tokensDiscovered: number;
  tokensUpserted: number;
}
```

**Upsert Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Upserter.upsert()                        │
└─────────────────────────────────────────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    ▼                         ▼                         ▼
┌─────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ 1. Extract  │      │ 2. Fetch missing│      │ 3. DB Upsert    │
│ token addrs │ ───▶ │ token metadata  │ ───▶ │ (transaction)   │
└─────────────┘      └─────────────────┘      └─────────────────┘
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
              ┌───────────┐     ┌───────────┐
              │ CoinGecko │     │ On-chain  │
              │ lookup    │     │ RPC call  │
              └───────────┘     └───────────┘
```

**Token Discovery Strategy:**

```typescript
async function resolveTokens(transfers: ParsedTransfer[], chain: string): Promise<void> {
  const tokenAddresses = transfers
    .filter(t => t.type === 'token')
    .map(t => t.token.address);

  // 1. Check which tokens already exist
  const existing = await tokenRepo.findByAddresses(chain, tokenAddresses);
  const missing = tokenAddresses.filter(a => !existing.has(a));

  // 2. Fetch metadata for missing tokens
  for (const address of missing) {
    const metadata = await tokenMetadataFetcher.fetch(chain, address);
    await tokenRepo.upsert(metadata);
  }
}
```

**Token Metadata Fetcher Priority:**
1. **On-chain RPC** - name(), symbol(), decimals() calls (always accurate)
2. **CoinGecko** - logo_uri, coingecko_id for pricing (enrichment)
3. **Fallback defaults** - Unknown token with address as name if all fails

**Database Operations (single transaction):**

```typescript
await db.transaction().execute(async (trx) => {
  // 1. Upsert tokens first (foreign key safe)
  await tokenRepo.upsertMany(tokens, trx);

  // 2. Upsert transaction
  const txId = await transactionRepo.upsert({
    chain, network, txHash, blockNumber, blockHash,
    fromAddress, toAddress, value, fee, status,
    classificationType: result.type,
    classificationLabel: result.label,
    protocolName: result.protocol,
  }, trx);

  // 3. Upsert transfers
  await nativeTransferRepo.upsertMany(nativeTransfers, txId, trx);
  await tokenTransferRepo.upsertMany(tokenTransfers, txId, trx);
});
```

**Upsert Conflict Strategy:**
- Transactions: ON CONFLICT (chain, network, tx_hash) → UPDATE classification fields
- Tokens: ON CONFLICT (chain, network, address) → UPDATE metadata if richer
- Transfers: ON CONFLICT (tx_id, from, to, amount) → DO NOTHING

---

## ChainFetcher Design

**Responsibility:** Fetch raw transaction data from RPC for any supported chain.

```typescript
interface ChainFetcher {
  fetch(chain: string, txHash: string): Promise<RawTransaction>;
}

interface RawTransaction {
  chain: string;
  network: string;
  txHash: string;
  blockNumber: string;
  blockHash: string;
  timestamp: Date;
  from: string;
  to: string | null;
  value: string;
  fee: string;
  status: 'success' | 'failed' | 'pending';

  // Ecosystem-specific raw data for classifier
  raw: EvmTransactionData | SvmTransactionData;
}
```

**EVM Data (for classification):**

```typescript
interface EvmTransactionData {
  type: 'evm';
  input: string;           // Calldata for method detection
  logs: TransactionLog[];  // Events for transfer/swap detection
  trace?: CallTrace;       // Internal calls (optional, for complex txs)
  gasUsed: string;
  gasPrice: string;
}
```

**SVM Data (for classification):**

```typescript
interface SvmTransactionData {
  type: 'svm';
  instructions: ParsedInstruction[];  // Program calls
  innerInstructions: ParsedInstruction[];
  preBalances: string[];
  postBalances: string[];
  preTokenBalances: TokenBalance[];
  postTokenBalances: TokenBalance[];
}
```

**Implementation Strategy:**

```typescript
class ChainFetcherRegistry {
  private fetchers: Map<Ecosystem, ChainFetcher> = new Map();

  register(ecosystem: 'evm' | 'svm', fetcher: ChainFetcher) {
    this.fetchers.set(ecosystem, fetcher);
  }

  async fetch(chainAlias: string, txHash: string): Promise<RawTransaction> {
    const { ecosystem, rpcUrl } = resolveChain(chainAlias);
    const fetcher = this.fetchers.get(ecosystem);
    return fetcher.fetch(chainAlias, txHash, rpcUrl);
  }
}
```

**RPC Calls:**

| Data | EVM RPC | SVM RPC |
|------|---------|---------|
| Transaction | `eth_getTransactionByHash` | `getTransaction` |
| Receipt/Status | `eth_getTransactionReceipt` | (included above) |
| Block timestamp | `eth_getBlockByNumber` | `getBlock` |
| Logs | Receipt includes logs | Token balance changes |

---

## Integration & Error Handling

**Integration with Reconciliation Worker:**

```typescript
// Current reconciliation flow
class ReconciliationWorker {
  async processAddress(address: string, chain: string) {
    const txHashes = await this.novesProvider.getTransactionHistory(address, chain);

    for (const txHash of txHashes) {
      // NEW: Use TransactionProcessor instead of direct Noves save
      await this.transactionProcessor.process(chain, txHash);
    }
  }
}
```

**Future API Endpoint (for indexing):**

```typescript
// POST /v2/transactions/index
// Body: { chain: "eth", txHash: "0x..." }
async function indexTransaction(request, reply) {
  const { chain, txHash } = request.body;
  const result = await transactionProcessor.process(chain, txHash);
  return reply.send(result);
}
```

**Error Handling Strategy:**

| Error Type | Handling | Retry? |
|------------|----------|--------|
| RPC timeout | Log, retry with backoff | Yes (3x) |
| RPC rate limit | Exponential backoff | Yes (5x) |
| Invalid tx hash | Return error, don't save | No |
| Token metadata fetch fail | Save tx, mark token unresolved | No |
| Classification unknown | Fallback to Noves | N/A |
| Noves fallback fail | Save with type "unknown" | No |
| DB upsert fail | Rollback, throw | Yes (2x) |

**Partial Failure Handling:**

```typescript
async process(chain: string, txHash: string): Promise<ProcessResult> {
  // 1. Fetch - hard fail if tx doesn't exist
  const rawTx = await this.fetcher.fetch(chain, txHash);

  // 2. Classify - soft fail to "unknown"
  let classification: ClassificationResult;
  try {
    classification = await this.classifier.classify(rawTx);
  } catch (e) {
    classification = { type: 'unknown', confidence: 'low', source: 'custom' };
  }

  // 3. Token resolution - soft fail, continue without enrichment
  const tokens = await this.resolveTokensSafe(classification.transfers);

  // 4. Upsert - hard fail, must succeed
  return await this.upserter.upsert(classification, rawTx, tokens);
}
```

**Idempotency:** Processing same txHash twice is safe - upsert updates existing records.

---

## Testing Strategy

**Unit Tests:**

| Component | Test Focus |
|-----------|------------|
| `EvmClassifier` | Known tx patterns → correct type (swap logs, transfer events, etc.) |
| `SvmClassifier` | Program ID detection, instruction parsing |
| `TokenMetadataFetcher` | CoinGecko response parsing, RPC call mocking |
| `TransactionUpserter` | Upsert conflicts, partial token resolution |
| `ChainFetcher` | RPC response mapping to RawTransaction |

**Classification Test Cases:**

```typescript
describe('EvmClassifier', () => {
  it('classifies Uniswap V3 swap from Swap event', async () => {
    const tx = loadFixture('uniswap-v3-swap.json');
    const result = await classifier.classify(tx);
    expect(result.type).toBe('swap');
    expect(result.protocol).toBe('uniswap_v3');
  });

  it('classifies simple ETH transfer', async () => { /* ... */ });
  it('classifies ERC20 approval', async () => { /* ... */ });
  it('classifies mint from zero address', async () => { /* ... */ });
  it('falls back to Noves on unknown', async () => { /* ... */ });
});
```

**Integration Tests:**

```typescript
describe('TransactionProcessor', () => {
  it('processes EVM swap and upserts tokens', async () => {
    const result = await processor.process('eth', '0xabc...');

    expect(result.transactionId).toBeDefined();
    expect(result.tokensUpserted).toBeGreaterThan(0);

    // Verify DB state
    const tx = await transactionRepo.findByTxHash('eth', 'mainnet', '0xabc...');
    expect(tx.classificationType).toBe('swap');
  });

  it('handles unknown tx with Noves fallback', async () => { /* ... */ });
  it('is idempotent on repeat processing', async () => { /* ... */ });
});
```

**Fixtures:** Store real transaction data from mainnet for reliable test cases.

---

## File Structure

```
services/core/src/services/transaction-processor/
├── index.ts                    # TransactionProcessor orchestrator
├── types.ts                    # Shared interfaces
├── chain-fetcher/
│   ├── index.ts                # ChainFetcherRegistry
│   ├── evm-fetcher.ts          # EVM RPC fetching
│   └── svm-fetcher.ts          # SVM RPC fetching
├── classifier/
│   ├── index.ts                # ClassifierRegistry (custom + Noves)
│   ├── evm-classifier.ts       # EVM classification logic
│   ├── svm-classifier.ts       # SVM classification logic
│   ├── noves-classifier.ts     # Noves fallback adapter
│   └── protocols/              # Protocol-specific detectors
│       ├── uniswap.ts
│       ├── jupiter.ts
│       └── ...
├── upserter/
│   ├── index.ts                # TransactionUpserter
│   └── token-metadata-fetcher.ts
└── __tests__/
    ├── fixtures/               # Real tx data for tests
    ├── evm-classifier.test.ts
    ├── svm-classifier.test.ts
    └── transaction-processor.test.ts
```

---

## Future Considerations

- **Batch processing:** Process multiple tx hashes in parallel for efficiency
- **Webhook triggers:** Notify downstream systems when new tx is indexed
- **Classification learning:** Log discrepancies between custom and Noves for improvement
- **Protocol registry:** Extensible system for adding new DEX/protocol detectors
