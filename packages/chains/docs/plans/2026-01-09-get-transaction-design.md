# getTransaction Feature Design

## Overview

Add `getTransaction(hash)` functionality to fetch transaction details by hash across all supported ecosystems (EVM, SVM, UTXO, TVM, XRP, Substrate). Returns both raw ecosystem-specific data and a normalized format for consistent cross-chain usage.

## Use Cases

1. **Transaction status tracking** - Check if a broadcasted transaction is confirmed, pending, or failed
2. **Transaction parsing/analysis** - Extract sender, recipient, value, token transfers, internal transactions
3. **Historical lookup** - Look up past transactions for auditing, display, or verification

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Return format | Both raw + normalized | Unified API for common cases, full ecosystem access when needed |
| Token transfers | Include parsed transfers | Required for transaction parsing use case |
| Internal transactions | Include with graceful degradation | Full detail when available, flag when limited |
| RPC limitations | Graceful degradation | Return available data with completeness flags |
| Status model | Unified enum + chain-specific in raw | Simple status for common use, full detail available |
| Error handling | Specific error types | Consistent with existing pattern (ChainError, etc.) |
| API exposure | Provider interface + convenience function | Matches existing patterns (getNativeBalance, etc.) |

---

## Core Types

### TransactionResult

```typescript
interface TransactionResult {
  chainAlias: ChainAlias;
  raw: RawTransactionResult;
  normalized: NormalizedTransactionResult;
}
```

### NormalizedTransactionResult

```typescript
type TransactionStatus = 'pending' | 'confirmed' | 'failed';

interface NormalizedTransactionResult {
  hash: string;
  status: TransactionStatus;
  blockNumber: number | null;        // null if pending
  blockHash: string | null;
  timestamp: number | null;          // unix timestamp
  from: string;
  to: string | null;                 // null for contract creation
  value: string;                     // native value in base units
  fee: string;                       // actual fee paid
  confirmations: number;
  finalized: boolean;

  // Parsed transfers
  tokenTransfers: TokenTransferEvent[];
  internalTransactions: InternalTransaction[];

  // Data completeness flags
  hasFullTokenData: boolean;
  hasFullInternalData: boolean;
}
```

### TokenTransferEvent

```typescript
interface TokenTransferEvent {
  contractAddress: string;
  from: string;
  to: string;
  value: string;                     // raw amount in base units
  tokenType: 'erc20' | 'erc721' | 'erc1155' | 'spl' | 'trc20' | 'trc721';
  tokenId?: string;                  // for NFTs (721/1155)
  decimals?: number;                 // if available from parsing
  symbol?: string;                   // if available
  logIndex: number;                  // ordering within transaction
}
```

### InternalTransaction

```typescript
interface InternalTransaction {
  from: string;
  to: string | null;
  value: string;
  type: 'call' | 'create' | 'delegatecall' | 'staticcall' | 'selfdestruct' | 'utxo-input' | 'utxo-output';
  input?: string;                    // call data
  output?: string;                   // return data
  error?: string;                    // if the internal call reverted
  traceIndex: number;                // ordering/depth indicator
}
```

---

## Raw Transaction Formats

Each ecosystem returns its native format with the `_chain` discriminator.

### EVM

```typescript
interface RawEvmTransactionResult {
  _chain: 'evm';
  transaction: {
    hash: string;
    nonce: string;
    blockHash: string | null;
    blockNumber: string | null;
    transactionIndex: string | null;
    from: string;
    to: string | null;
    value: string;
    gasPrice: string;
    gas: string;
    input: string;
    // EIP-1559 fields
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    type: string;
  };
  receipt: {
    transactionHash: string;
    blockHash: string;
    blockNumber: string;
    gasUsed: string;
    effectiveGasPrice: string;
    status: string;                  // '0x1' success, '0x0' failure
    logs: Array<{
      address: string;
      topics: string[];
      data: string;
      logIndex: string;
    }>;
    contractAddress: string | null;
  };
  trace?: {
    calls?: Array<{
      from: string;
      to: string;
      value: string;
      type: string;
      input: string;
      output?: string;
      error?: string;
    }>;
  };
}
```

### SVM (Solana)

```typescript
interface RawSolanaTransactionResult {
  _chain: 'svm';
  transaction: {
    slot: number;
    blockTime: number | null;
    meta: {
      err: object | null;
      fee: number;
      preBalances: number[];
      postBalances: number[];
      innerInstructions: Array<{
        index: number;
        instructions: Array<{
          programIdIndex: number;
          accounts: number[];
          data: string;
        }>;
      }>;
      logMessages: string[];
      preTokenBalances: Array<{
        accountIndex: number;
        mint: string;
        owner: string;
        uiTokenAmount: { amount: string; decimals: number };
      }>;
      postTokenBalances: Array<{
        accountIndex: number;
        mint: string;
        owner: string;
        uiTokenAmount: { amount: string; decimals: number };
      }>;
    };
    transaction: {
      message: {
        accountKeys: string[];
        instructions: Array<{
          programIdIndex: number;
          accounts: number[];
          data: string;
        }>;
        recentBlockhash: string;
      };
      signatures: string[];
    };
  };
}
```

### UTXO (Bitcoin)

```typescript
interface RawUtxoTransactionResult {
  _chain: 'utxo';
  transaction: {
    txid: string;
    version: number;
    vin: Array<{
      txid: string;
      vout: number;
      sequence: number;
      addresses: string[];
      value: string;
    }>;
    vout: Array<{
      value: string;
      n: number;
      addresses: string[];
      isAddress: boolean;
    }>;
    blockHash?: string;
    blockHeight?: number;
    confirmations: number;
    blockTime?: number;
    fees: string;
    size: number;
    vsize: number;
  };
}
```

### TVM (TRON)

```typescript
interface RawTronTransactionResult {
  _chain: 'tvm';
  transaction: {
    txID: string;
    raw_data: {
      contract: Array<{
        parameter: {
          value: {
            owner_address: string;
            to_address?: string;
            amount?: number;
            contract_address?: string;
            data?: string;
          };
          type_url: string;
        };
        type: string;
      }>;
      ref_block_bytes: string;
      ref_block_hash: string;
      expiration: number;
      timestamp: number;
    };
    raw_data_hex: string;
    signature: string[];
    ret?: Array<{ contractRet: string }>;
  };
  info: {
    id: string;
    blockNumber: number;
    blockTimeStamp: number;
    contractResult: string[];
    receipt: {
      net_fee?: number;
      energy_fee?: number;
      energy_usage_total?: number;
      result?: string;
    };
    log?: Array<{
      address: string;
      topics: string[];
      data: string;
    }>;
    internal_transactions?: Array<{
      caller_address: string;
      transferTo_address: string;
      callValueInfo: Array<{ callValue: number }>;
    }>;
  };
}
```

---

## Error Types

Add to `src/core/errors.ts`:

```typescript
export class TransactionNotFoundError extends ChainError {
  constructor(chainAlias: ChainAlias, hash: string) {
    super(chainAlias, `Transaction not found: ${hash}`);
    this.name = 'TransactionNotFoundError';
  }
}

export class InvalidTransactionHashError extends ChainError {
  constructor(chainAlias: ChainAlias, hash: string, reason?: string) {
    super(chainAlias, `Invalid transaction hash: ${hash}${reason ? ` (${reason})` : ''}`);
    this.name = 'InvalidTransactionHashError';
  }
}
```

---

## Implementation by Ecosystem

### EVM

1. Validate hash: 66 chars, `0x` prefix, hex
2. `eth_getTransactionByHash` - get transaction data
3. `eth_getTransactionReceipt` - get receipt with logs and status
4. `debug_traceTransaction` (optional) - attempt internal transactions
   - If RPC returns error/unsupported, set `hasFullInternalData: false`
5. Parse logs for token transfers:
   - ERC20: `Transfer(address,address,uint256)` - topic `0xddf252ad...`
   - ERC721: `Transfer(address,address,uint256)` - same topic, check indexed tokenId
   - ERC1155: `TransferSingle` and `TransferBatch` topics

### SVM (Solana)

1. Validate hash: 87-88 chars, base58
2. `getTransaction` with `maxSupportedTransactionVersion: 0`, encoding: `jsonParsed`
3. Inner instructions included in `meta.innerInstructions`
4. Parse token transfers by comparing `preTokenBalances` vs `postTokenBalances`
5. Check for SPL Token Program ID: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`

### UTXO (Bitcoin)

1. Validate hash: 64 chars, hex (no prefix)
2. `BlockbookClient.getTransaction(hash)` - full tx with inputs/outputs
3. Map to normalized format:
   - `from`: first input address (or address with largest input value)
   - `to`: first non-change output address
   - `value`: sum of outputs to non-change addresses
4. Represent inputs/outputs as internal transactions with `type: 'utxo-input' | 'utxo-output'`
5. Confirmations from `transaction.confirmations` field

### TVM (TRON)

1. Validate hash: 64 chars, hex (no prefix)
2. `wallet/gettransactionbyid` - get transaction data
3. `wallet/gettransactioninfobyid` - get receipt, fee, logs, internal transactions
4. Parse logs for TRC20 Transfer events (same signature as ERC20)
5. Internal transactions available in `info.internal_transactions`

---

## Public API

### Interface Addition

```typescript
// In src/core/interfaces.ts
interface ITransactionFetcher {
  getTransaction(hash: string): Promise<TransactionResult>;
}

// Add to IChainProvider
interface IChainProvider extends IBalanceFetcher, ITransactionBuilder, ITransactionFetcher {
  // ... existing methods
}
```

### Convenience Function

```typescript
// In src/api.ts
export async function getTransaction(
  chainAlias: ChainAlias,
  hash: string,
  rpcUrl?: string
): Promise<TransactionResult> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.getTransaction(hash);
}
```

### Type Guards

```typescript
export function isEvmTransactionResult(
  result: RawTransactionResult
): result is RawEvmTransactionResult {
  return result._chain === 'evm';
}

export function isSolanaTransactionResult(
  result: RawTransactionResult
): result is RawSolanaTransactionResult {
  return result._chain === 'svm';
}

export function isUtxoTransactionResult(
  result: RawTransactionResult
): result is RawUtxoTransactionResult {
  return result._chain === 'utxo';
}

export function isTronTransactionResult(
  result: RawTransactionResult
): result is RawTronTransactionResult {
  return result._chain === 'tvm';
}
```

---

## File Organization

### New Files

```
src/core/types.ts                   # Add TransactionResult types
src/core/errors.ts                  # Add error classes

src/evm/transaction-fetcher.ts      # EvmTransactionFetcher class
src/svm/transaction-fetcher.ts      # SvmTransactionFetcher class
src/utxo/transaction-fetcher.ts     # UtxoTransactionFetcher class
src/tvm/transaction-fetcher.ts      # TvmTransactionFetcher class
```

### Modified Files

```
src/core/interfaces.ts              # Add ITransactionFetcher

src/evm/provider.ts                 # Add getTransaction()
src/svm/provider.ts                 # Add getTransaction()
src/utxo/provider.ts                # Add getTransaction()
src/tvm/provider.ts                 # Add getTransaction()

src/api.ts                          # Add convenience function + type guards

src/evm/index.ts                    # Export new types
src/svm/index.ts                    # Export new types
src/utxo/index.ts                   # Export new types
src/tvm/index.ts                    # Export new types
src/index.ts                        # Export from api
```

---

## Usage Example

```typescript
import { getTransaction, isEvmTransactionResult } from '@io-vault/chains';

// Fetch transaction
const result = await getTransaction('ethereum', '0xabc123...');

// Use normalized data for common operations
console.log(result.normalized.status);           // 'confirmed'
console.log(result.normalized.from);             // '0x123...'
console.log(result.normalized.tokenTransfers);   // parsed ERC20 transfers
console.log(result.normalized.hasFullInternalData); // true/false

// Access ecosystem-specific data when needed
if (isEvmTransactionResult(result.raw)) {
  console.log(result.raw.receipt.gasUsed);
  console.log(result.raw.trace?.calls);          // internal transactions if available
}
```

---

## Trade-offs

1. **Extra RPC calls** - EVM needs 2-3 calls (tx + receipt + optional trace), TVM needs 2 calls. Necessary for complete data.

2. **Parsing complexity** - Token transfer parsing requires maintaining known event signatures. May miss exotic token standards.

3. **UTXO abstraction** - Mapping inputs/outputs to from/to is imperfect for multi-input/output transactions. Raw data preserves full detail.

---

## Out of Scope

- Batch transaction fetching (`getTransactions([hash1, hash2, ...])`)
- Transaction history by address
- Mempool/pending transaction monitoring
