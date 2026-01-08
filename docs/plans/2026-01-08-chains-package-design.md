# Chains Package Design

**Date:** 2026-01-08
**Status:** Approved

## Overview

Internal package (`/packages/chains`) providing a unified interface for blockchain operations across multiple ecosystems. Replaces dependency on external `@iofinnet/io-core-dapp-utils-chains-sdk` with an RPC-first approach.

## Package Structure

```
/packages/chains/
  package.json
  tsconfig.json
  src/
    index.ts                    # Public API exports
    core/
      types.ts                  # Shared types
      interfaces.ts             # IBalanceFetcher, ITransactionBuilder, IContractInteraction
      errors.ts                 # ChainError, RpcError, BroadcastError, etc.
      rpc-client.ts             # Generic JSON-RPC client wrapper
      registry.ts               # Chain registry and ecosystem mapping
      config.ts                 # RPC override configuration
      provider-cache.ts         # Provider instance caching
      transaction-parser.ts     # parseTransaction() - offline tx reconstruction
    evm/
      index.ts                  # EVM chain provider factory
      balance.ts                # eth_getBalance, ERC20 balanceOf
      transactions.ts           # EIP-1559 transaction building
      transaction-builder.ts    # UnsignedEvmTransaction class
      broadcast.ts              # eth_sendRawTransaction
      contracts.ts              # Contract read/call/deploy
      config.ts                 # EVM chain configs
    svm/
      index.ts                  # Solana provider factory
      balance.ts                # getBalance, getTokenAccountBalance
      transactions.ts           # Solana transaction building
      transaction-builder.ts    # UnsignedSolanaTransaction class
      broadcast.ts              # sendTransaction
      contracts.ts              # Program interaction
      config.ts                 # SVM chain configs
    utxo/
      index.ts                  # Bitcoin/UTXO provider factory
      balance.ts                # Blockbook balance
      transactions.ts           # UTXO transaction building
      transaction-builder.ts    # UnsignedUtxoTransaction class
      broadcast.ts              # Blockbook sendtx
      config.ts                 # UTXO chain configs (bitcoin, mnee)
    tvm/
      index.ts                  # TRON provider factory
      balance.ts                # TRX and TRC20 balance
      transactions.ts           # TRON transaction building
      transaction-builder.ts    # UnsignedTronTransaction class
      broadcast.ts              # /wallet/broadcasttransaction
      contracts.ts              # TVM contract interaction
      config.ts                 # TVM chain configs
    xrp/
      index.ts                  # XRP Ledger provider factory
      balance.ts                # account_info balance
      transactions.ts           # XRP transaction building
      transaction-builder.ts    # UnsignedXrpTransaction class
      broadcast.ts              # submit
      config.ts                 # XRP chain configs
    substrate/
      index.ts                  # Substrate provider factory
      balance.ts                # system.account balance
      transactions.ts           # Substrate transaction building
      transaction-builder.ts    # UnsignedSubstrateTransaction class
      broadcast.ts              # author_submitExtrinsic
      config.ts                 # Substrate chain configs (bittensor)
  tests/
    unit/
      core/
        transaction-parser.test.ts
      evm/
        transaction-builder.test.ts
        broadcast.test.ts
      svm/
        transaction-builder.test.ts
        broadcast.test.ts
      utxo/
        transaction-builder.test.ts
        broadcast.test.ts
      tvm/
        transaction-builder.test.ts
        broadcast.test.ts
      xrp/
        transaction-builder.test.ts
        broadcast.test.ts
      substrate/
        transaction-builder.test.ts
        broadcast.test.ts
    mocks/
    fixtures/
```

## Core Types

### Chain Aliases

```typescript
export type EvmChainAlias = 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'base' | 'avalanche' | 'bsc';
export type SvmChainAlias = 'solana' | 'solana-devnet';
export type UtxoChainAlias = 'bitcoin' | 'bitcoin-testnet' | 'mnee';
export type TvmChainAlias = 'tron' | 'tron-testnet';
export type XrpChainAlias = 'xrp' | 'xrp-testnet';
export type SubstrateChainAlias = 'bittensor' | 'bittensor-testnet';

export type ChainAlias =
  | EvmChainAlias
  | SvmChainAlias
  | UtxoChainAlias
  | TvmChainAlias
  | XrpChainAlias
  | SubstrateChainAlias;

export type Ecosystem = 'evm' | 'svm' | 'utxo' | 'tvm' | 'xrp' | 'substrate';

// Mapping from chain alias to ecosystem (for type inference)
export const CHAIN_ECOSYSTEM_MAP: Record<ChainAlias, Ecosystem> = {
  ethereum: 'evm',
  polygon: 'evm',
  arbitrum: 'evm',
  optimism: 'evm',
  base: 'evm',
  avalanche: 'evm',
  bsc: 'evm',
  solana: 'svm',
  'solana-devnet': 'svm',
  bitcoin: 'utxo',
  'bitcoin-testnet': 'utxo',
  mnee: 'utxo',
  tron: 'tvm',
  'tron-testnet': 'tvm',
  xrp: 'xrp',
  'xrp-testnet': 'xrp',
  bittensor: 'substrate',
  'bittensor-testnet': 'substrate',
} as const;
```

### Balance Types

```typescript
export interface BalanceInfo {
  balance: string;          // Raw balance in smallest unit
  formattedBalance: string; // Human-readable
  symbol: string;
  decimals: number;
}

export interface NativeBalance extends BalanceInfo {}

export interface TokenBalance extends BalanceInfo {
  contractAddress: string;
  name?: string;
  logoUri?: string;
}
```

### Transaction Types

```typescript
export interface UnsignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly raw: unknown;              // Chain-specific raw transaction
  readonly serialized: string;        // Hex/base58 encoded

  /**
   * Rebuild transaction with updated mutable parameters.
   * Returns a new UnsignedTransaction - original is not modified.
   */
  rebuild(overrides: TransactionOverrides): UnsignedTransaction;

  /**
   * Get the data that needs to be signed.
   * For EVM: RLP-encoded transaction hash
   * For SVM: Message bytes
   * For UTXO: Sighash per input
   */
  getSigningPayload(): SigningPayload;

  /**
   * Apply signature(s) to create a signed transaction.
   * Signatures array must match length of getSigningPayload().data
   */
  applySignature(signatures: string[]): SignedTransaction;

  /**
   * Decode to normalised format for display.
   */
  toNormalised(): NormalisedTransaction;
}

export interface SigningPayload {
  chainAlias: ChainAlias;
  data: string[];              // Always array, even if single item
  algorithm: 'secp256k1' | 'ed25519';
}

export interface SignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly serialized: string;
  readonly hash: string;           // Known before broadcast

  /**
   * Broadcast transaction to the network.
   * Returns immediately after node accepts - does not wait for confirmation.
   */
  broadcast(rpcUrl?: string): Promise<BroadcastResult>;
}

export interface BroadcastResult {
  hash: string;
  success: boolean;
  error?: string;
}

export type DecodeFormat = 'raw' | 'normalised';

export type TransactionType =
  | 'native-transfer'
  | 'token-transfer'
  | 'nft-transfer'
  | 'contract-call'
  | 'contract-deployment'
  | 'approval'
  | 'unknown';

/**
 * Normalised transaction for consistent cross-chain rendering.
 * All chains map to this structure regardless of their native format.
 *
 * Note: `from` is optional because:
 * - Unsigned EVM transactions don't include the sender (recovered from signature)
 * - UTXO transactions have multiple inputs, no single sender
 * - For signed transactions, `from` will always be populated
 */
export interface NormalisedTransaction {
  chainAlias: ChainAlias;
  hash?: string;
  from?: string;                        // Optional: empty for unsigned EVM, UTXO
  to: string | null;                    // null = contract deployment
  value: string;                        // Raw units (wei, lamports, satoshis)
  formattedValue: string;               // Human-readable with decimals
  symbol: string;                       // Native currency symbol
  fee?: {
    value: string;
    formattedValue: string;
    symbol: string;
  };
  type: TransactionType;
  tokenTransfer?: {
    contractAddress: string;
    from: string;
    to: string;
    value: string;
    formattedValue: string;             // Required for UI rendering
    symbol: string;                     // Required for UI rendering
    decimals: number;                   // Required for formatting
    tokenId?: string;                   // For NFTs (ERC721, ERC1155)
  };
  contractCall?: {
    contractAddress: string;
    method?: string;                    // Function name if known
    selector?: string;                  // EVM selector / instruction type
  };
  data?: string;
  metadata: {
    nonce?: number;
    sequence?: number;                  // XRP
    memo?: string;
    isContractDeployment: boolean;
    inputCount?: number;                // UTXO
    outputCount?: number;               // UTXO
  };
  // UTXO-specific: all outputs for multi-recipient transactions
  outputs?: Array<{
    address: string | null;
    value: string;
    formattedValue: string;
  }>;
}

// Union of all raw transaction types (see Transaction Decoding section)
export type RawTransaction =
  | RawEvmTransaction
  | RawSolanaTransaction
  | RawUtxoTransaction
  | RawTronTransaction
  | RawXrpTransaction;

export interface NativeTransferParams {
  from: string;
  to: string;
  value: string;
  overrides?: TransactionOverrides;
}

export interface TokenTransferParams {
  from: string;
  to: string;
  contractAddress: string;
  value: string;
  overrides?: TransactionOverrides;
}
```

### Contract Types

```typescript
export interface ContractReadParams {
  contractAddress: string;
  data: string;
  from?: string;
}

export interface ContractReadResult {
  data: string;
}

export interface ContractCallParams {
  from: string;
  contractAddress: string;
  data: string;
  value?: string;
  overrides?: TransactionOverrides;
}

export interface ContractDeployParams {
  from: string;
  bytecode: string;
  constructorArgs?: string;
  value?: string;
  overrides?: TransactionOverrides;
}

export interface DeployedContract {
  transaction: UnsignedTransaction;
  expectedAddress: string;
}
```

### Gas/Fee Overrides

```typescript
// EVM - EIP-1559
export interface EvmTransactionOverrides {
  nonce?: number;
  maxFeePerGas?: string;        // In WEI (not GWEI)
  maxPriorityFeePerGas?: string; // In WEI (not GWEI)
  gasLimit?: string;
}

// SVM - Compute Budget
export interface SvmTransactionOverrides {
  recentBlockhash?: string;
  computeUnitLimit?: number;
  computeUnitPrice?: number;
}

// UTXO - Fee Rate
export interface UtxoTransactionOverrides {
  feeRate?: number;  // sat/vB
}

// TVM - Energy
export interface TvmTransactionOverrides {
  feeLimit?: number;
}

// XRP - Drops
export interface XrpTransactionOverrides {
  sequence?: number;
  fee?: string;   // In drops
}

// Substrate - Weight
export interface SubstrateTransactionOverrides {
  tip?: string;
  nonce?: number;
}

// Mapping from ecosystem to override type (for type-safe params)
export interface EcosystemOverridesMap {
  evm: EvmTransactionOverrides;
  svm: SvmTransactionOverrides;
  utxo: UtxoTransactionOverrides;
  tvm: TvmTransactionOverrides;
  xrp: XrpTransactionOverrides;
  substrate: SubstrateTransactionOverrides;
}

// Union type for runtime use
export type TransactionOverrides =
  | EvmTransactionOverrides
  | SvmTransactionOverrides
  | UtxoTransactionOverrides
  | TvmTransactionOverrides
  | XrpTransactionOverrides
  | SubstrateTransactionOverrides;
```

### Chain Config

```typescript
export interface ChainConfig {
  chainAlias: ChainAlias;
  rpcUrl: string;
  nativeCurrency: { symbol: string; decimals: number };
  chainId?: number;           // EVM chains
  supportsEip1559?: boolean;  // EVM fee standard
}
```

## Interfaces

```typescript
export interface IBalanceFetcher {
  getNativeBalance(address: string): Promise<NativeBalance>;
  getTokenBalance(address: string, contractAddress: string): Promise<TokenBalance>;
}

export interface ITransactionBuilder {
  buildNativeTransfer(params: NativeTransferParams): Promise<UnsignedTransaction>;
  buildTokenTransfer(params: TokenTransferParams): Promise<UnsignedTransaction>;
  /**
   * Decode a serialized transaction (synchronous - no network required).
   */
  decode<F extends DecodeFormat>(
    serialized: string,
    format: F
  ): F extends 'raw' ? RawTransaction : NormalisedTransaction;
  estimateFee(): Promise<FeeEstimate>;
  estimateGas(params: ContractCallParams): Promise<string>;
}

export interface IContractInteraction {
  contractRead(params: ContractReadParams): Promise<ContractReadResult>;
  contractCall(params: ContractCallParams): Promise<UnsignedTransaction>;
  contractDeploy(params: ContractDeployParams): Promise<DeployedContract>;
}

export interface IChainProvider extends IBalanceFetcher, ITransactionBuilder, IContractInteraction {
  readonly config: ChainConfig;
  readonly chainAlias: ChainAlias;
}
```

## Public API

```typescript
// Configuration
export function configure(config: ChainProviderConfig): void;

// Provider factory
export function getChainProvider(chainAlias: ChainAlias, rpcUrl?: string): IChainProvider;

// Utility functions
export function getEcosystem(chainAlias: ChainAlias): Ecosystem;
export function isValidChainAlias(value: string): value is ChainAlias;
export function isValidEcosystem(value: string): value is Ecosystem;

// Balance convenience functions
export async function getNativeBalance(chainAlias: ChainAlias, address: string, rpcUrl?: string): Promise<NativeBalance>;
export async function getTokenBalance(chainAlias: ChainAlias, address: string, contractAddress: string, rpcUrl?: string): Promise<TokenBalance>;

// Transaction convenience functions
export async function buildNativeTransfer(chainAlias: ChainAlias, params: NativeTransferParams, rpcUrl?: string): Promise<UnsignedTransaction>;
export async function buildTokenTransfer(chainAlias: ChainAlias, params: TokenTransferParams, rpcUrl?: string): Promise<UnsignedTransaction>;

/**
 * Decode a serialized transaction.
 * Note: No rpcUrl needed - decoding is an offline operation.
 */
export function decodeTransaction<F extends DecodeFormat>(
  chainAlias: ChainAlias,
  serialized: string,
  format: F
): F extends 'raw' ? RawTransaction : NormalisedTransaction;

/**
 * Parse a stored serialized transaction back into an UnsignedTransaction object.
 * Offline operation - reconstructs full object with rebuild/sign methods.
 *
 * Use case: Retrieve serialized tx from database, reconstruct object, then rebuild with new nonce.
 */
export function parseTransaction(
  chainAlias: ChainAlias,
  serialized: string
): UnsignedTransaction;

/**
 * Broadcast a signed transaction to the network.
 * Convenience function - equivalent to signedTx.broadcast(rpcUrl)
 */
export async function broadcastTransaction(
  chainAlias: ChainAlias,
  signedSerialized: string,
  rpcUrl?: string
): Promise<BroadcastResult>;

// Fee estimation
export interface FeeEstimate {
  slow: { fee: string; formattedFee: string };
  standard: { fee: string; formattedFee: string };
  fast: { fee: string; formattedFee: string };
}

export async function estimateFee(chainAlias: ChainAlias, rpcUrl?: string): Promise<FeeEstimate>;
export async function estimateGas(chainAlias: ChainAlias, params: ContractCallParams, rpcUrl?: string): Promise<string>;

// Account info (EVM/XRP)
export async function getTransactionCount(chainAlias: ChainAlias, address: string, rpcUrl?: string): Promise<number>;

// Contract convenience functions
export async function contractRead(chainAlias: ChainAlias, params: ContractReadParams, rpcUrl?: string): Promise<ContractReadResult>;
export async function contractCall(chainAlias: ChainAlias, params: ContractCallParams, rpcUrl?: string): Promise<UnsignedTransaction>;
export async function contractDeploy(chainAlias: ChainAlias, params: ContractDeployParams, rpcUrl?: string): Promise<DeployedContract>;

// Type guards for RawTransaction discrimination
export function isEvmTransaction(tx: RawTransaction): tx is RawEvmTransaction;
export function isSolanaTransaction(tx: RawTransaction): tx is RawSolanaTransaction;
export function isUtxoTransaction(tx: RawTransaction): tx is RawUtxoTransaction;
export function isTronTransaction(tx: RawTransaction): tx is RawTronTransaction;
export function isXrpTransaction(tx: RawTransaction): tx is RawXrpTransaction;

// Re-exports
export type {
  NativeBalance,
  TokenBalance,
  BalanceInfo,
  ChainConfig,
  ChainAlias,
  Ecosystem,
  UnsignedTransaction,
  SignedTransaction,
  SigningPayload,
  BroadcastResult,
  NormalisedTransaction,
  RawTransaction,
  RawEvmTransaction,
  RawSolanaTransaction,
  RawUtxoTransaction,
  RawTronTransaction,
  RawXrpTransaction,
  TransactionOverrides,
  EvmTransactionOverrides,
  SvmTransactionOverrides,
  UtxoTransactionOverrides,
  TvmTransactionOverrides,
  XrpTransactionOverrides,
  SubstrateTransactionOverrides,
  ContractReadParams,
  ContractCallParams,
  ContractDeployParams,
  DeployedContract,
  FeeEstimate,
  DecodeFormat,
  TransactionType,
};
```

## Error Handling

```typescript
// Base chain error
export class ChainError extends Error {
  constructor(
    message: string,
    public readonly chainAlias: ChainAlias,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ChainError';
  }
}

// RPC communication errors
export class RpcError extends ChainError {
  constructor(
    message: string,
    chainAlias: ChainAlias,
    public readonly code?: number,
    cause?: unknown
  ) {
    super(message, chainAlias, cause);
    this.name = 'RpcError';
  }
}

export class RpcTimeoutError extends RpcError {
  constructor(chainAlias: ChainAlias, timeoutMs: number) {
    super(`RPC request timed out after ${timeoutMs}ms`, chainAlias);
    this.name = 'RpcTimeoutError';
  }
}

export class RateLimitError extends RpcError {
  constructor(chainAlias: ChainAlias, retryAfterMs?: number) {
    super(
      retryAfterMs
        ? `Rate limited, retry after ${retryAfterMs}ms`
        : 'Rate limited by RPC provider',
      chainAlias,
      429
    );
    this.name = 'RateLimitError';
  }
}

// Validation errors
export class InvalidAddressError extends ChainError {
  constructor(chainAlias: ChainAlias, public readonly address: string) {
    super(`Invalid address: ${address}`, chainAlias);
    this.name = 'InvalidAddressError';
  }
}

export class InvalidTransactionError extends ChainError {
  constructor(chainAlias: ChainAlias, reason: string) {
    super(`Invalid transaction: ${reason}`, chainAlias);
    this.name = 'InvalidTransactionError';
  }
}

// Transaction errors
export class InsufficientBalanceError extends ChainError {
  constructor(
    chainAlias: ChainAlias,
    public readonly required: string,
    public readonly available: string
  ) {
    super(`Insufficient balance: required ${required}, available ${available}`, chainAlias);
    this.name = 'InsufficientBalanceError';
  }
}

export class TransactionFailedError extends ChainError {
  constructor(
    chainAlias: ChainAlias,
    public readonly txHash: string,
    reason?: string
  ) {
    super(reason ? `Transaction failed: ${reason}` : 'Transaction failed', chainAlias);
    this.name = 'TransactionFailedError';
  }
}

// Configuration errors
export class UnsupportedChainError extends Error {
  constructor(public readonly chainAlias: string) {
    super(`Unsupported chain: ${chainAlias}`);
    this.name = 'UnsupportedChainError';
  }
}

export class UnsupportedOperationError extends ChainError {
  constructor(chainAlias: ChainAlias, operation: string) {
    super(`Operation not supported: ${operation}`, chainAlias);
    this.name = 'UnsupportedOperationError';
  }
}

// Broadcast errors
export type BroadcastErrorCode =
  | 'ALREADY_KNOWN'        // Transaction already in mempool
  | 'NONCE_TOO_LOW'        // Nonce already used (EVM)
  | 'SEQUENCE_TOO_LOW'     // Sequence already used (XRP)
  | 'INSUFFICIENT_FUNDS'   // Can't pay gas/fee
  | 'UNDERPRICED'          // Gas price too low
  | 'EXPIRED'              // Blockhash/ledger expired
  | 'REJECTED'             // Node rejected (various reasons)
  | 'NETWORK_ERROR';       // RPC communication failure

export class BroadcastError extends ChainError {
  constructor(
    message: string,
    chainAlias: ChainAlias,
    public readonly code: BroadcastErrorCode,
    cause?: unknown
  ) {
    super(message, chainAlias, cause);
    this.name = 'BroadcastError';
  }
}
```

## Ecosystem Implementations

### EVM (Ethereum, Polygon, Arbitrum, etc.)

- **Balance**: `eth_getBalance`, `eth_call` for ERC20 `balanceOf`
- **Transactions**: EIP-1559 (type 2) with `maxFeePerGas` + `maxPriorityFeePerGas`
- **Gas Estimation**: `eth_estimateGas` with 20% buffer
- **Fee Estimation**: `eth_getBlockByNumber` for base fee, `eth_maxPriorityFeePerGas` for tip
- **Contracts**: `eth_call` for read, standard tx for call, `to: null` for deploy
- **Address Derivation**: `keccak256(rlp([sender, nonce]))[12:]` for CREATE

### SVM (Solana)

- **Balance**: `getBalance`, `getTokenAccountBalance` with ATA derivation
- **Transactions**: Versioned transactions with Compute Budget program
- **Fee Estimation**: `getRecentPrioritizationFees` for priority fee median
- **Contracts**: `simulateTransaction` for read, program instructions for call
- **Deployment**: Multi-step BPF loader process

### UTXO (Bitcoin)

- **Balance**: Blockbook JSON-RPC `getBalanceByAddress`
- **Transactions**: UTXO selection, fee rate in sat/vB
- **Contracts**: Not supported (throws `UnsupportedOperationError`)

### TVM (TRON)

- **Balance**: `wallet/getaccount`, `wallet/triggersmartcontract` for TRC20
- **Transactions**: HTTP POST to TRON API endpoints
- **Contracts**: `triggerconstantcontract` for read, `triggersmartcontract` for call, `deploycontract` for deploy

### XRP (XRP Ledger)

- **Balance**: `account_info` RPC, `account_lines` for trust lines
- **Transactions**: Standard XRP transaction format with sequence
- **Contracts**: Not supported (throws `UnsupportedOperationError`)

### Substrate (Bittensor)

- **Balance**: `system.account` RPC query
- **Transactions**: Substrate extrinsics with SCALE encoding
- **Fee Estimation**: `payment.queryInfo` for weight-based fees
- **Contracts**: Not supported (throws `UnsupportedOperationError`)

## Feature Support Matrix

| Feature | EVM | SVM | UTXO | TVM | XRP | Substrate |
|---------|-----|-----|------|-----|-----|-----------|
| getNativeBalance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| getTokenBalance | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| buildNativeTransfer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| buildTokenTransfer | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| decode | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| contractRead | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| contractCall | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| contractDeploy | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| estimateFee | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| getTransactionCount | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |

## Provider Caching Strategy

Providers are cached to avoid recreating connections for each operation.

### Cache Implementation

```typescript
// core/provider-cache.ts
interface CachedProvider {
  provider: IChainProvider;
  rpcUrl: string;
  createdAt: number;
}

class ProviderCache {
  private cache = new Map<string, CachedProvider>();
  private readonly maxAge = 5 * 60 * 1000; // 5 minutes

  getOrCreate(chainAlias: ChainAlias, rpcUrl: string): IChainProvider {
    const key = `${chainAlias}:${rpcUrl}`;
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.createdAt < this.maxAge) {
      return cached.provider;
    }

    const provider = createProvider(chainAlias, rpcUrl);
    this.cache.set(key, {
      provider,
      rpcUrl,
      createdAt: Date.now(),
    });

    return provider;
  }

  clear(): void {
    this.cache.clear();
  }

  clearChain(chainAlias: ChainAlias): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${chainAlias}:`)) {
        this.cache.delete(key);
      }
    }
  }
}

export const providerCache = new ProviderCache();
```

### Cache Behavior

- Providers are cached per `chainAlias:rpcUrl` combination
- Cache entries expire after 5 minutes (configurable)
- Expired entries are replaced on next access
- Cache can be cleared manually if needed

## RPC Configuration

### Default Configuration

Each chain has a default public RPC URL defined in its config file.

### Global Overrides

```typescript
import { configure } from '@/packages/chains';

configure({
  rpcOverrides: {
    ethereum: process.env.ETHEREUM_RPC_URL,
    polygon: process.env.POLYGON_RPC_URL,
    solana: process.env.SOLANA_RPC_URL,
  },
});
```

### Per-Call Overrides

```typescript
const balance = await getNativeBalance('ethereum', address, 'https://custom-rpc.com');
```

### Priority Order

1. Per-call `rpcUrl` parameter
2. Global `rpcOverrides` configuration
3. Default RPC from chain config

## Usage Examples

### Basic Balance Check

```typescript
import { getNativeBalance, getTokenBalance } from '@/packages/chains';

const ethBalance = await getNativeBalance('ethereum', '0x742d35Cc...');
// { balance: '1000000000000000000', formattedBalance: '1.0', symbol: 'ETH', decimals: 18 }

const usdcBalance = await getTokenBalance('ethereum', '0x742d35Cc...', '0xA0b86991...');
// { balance: '100000000', formattedBalance: '100.0', symbol: 'USDC', decimals: 6, contractAddress: '0xA0b86991...' }
```

### Building Transactions

```typescript
import { buildNativeTransfer, buildTokenTransfer } from '@/packages/chains';

// With defaults
const tx1 = await buildNativeTransfer('ethereum', {
  from: '0xSender',
  to: '0xRecipient',
  value: '1000000000000000000',
});

// With overrides
const tx2 = await buildNativeTransfer('ethereum', {
  from: '0xSender',
  to: '0xRecipient',
  value: '1000000000000000000',
  overrides: {
    nonce: 42,
    maxFeePerGas: '50000000000',
    maxPriorityFeePerGas: '2000000000',
    gasLimit: '21000',
  },
});
```

### Contract Interaction

```typescript
import { contractRead, contractCall, contractDeploy } from '@/packages/chains';

// Read contract state
const result = await contractRead('ethereum', {
  contractAddress: '0xUSDC',
  data: encodeFunction('balanceOf(address)', ['0xHolder']),
});

// Call contract function
const tx = await contractCall('ethereum', {
  from: '0xSender',
  contractAddress: '0xDEX',
  data: encodeFunction('swap(uint256,address)', [amount, tokenOut]),
  value: '1000000000000000000',
});

// Deploy contract
const deployment = await contractDeploy('polygon', {
  from: '0xDeployer',
  bytecode: '0x608060405234801561001057600080fd5b50...',
  constructorArgs: encodeConstructorArgs(['arg1', 123]),
});
console.log('Contract will be at:', deployment.expectedAddress);
```

## Testing Strategy

### Unit Tests

- Mock RPC calls to avoid network dependency
- Test each ecosystem independently
- Cover success cases, edge cases (zero balance, large numbers), and error cases
- Use fixtures for consistent test data

### Test Structure

```
tests/
  unit/
    core/
      registry.test.ts      # Chain registry and ecosystem mapping
      rpc-client.test.ts    # RPC client with mocked fetch
      errors.test.ts        # Error classes
    evm/
      balance.test.ts       # Native and token balance
      transactions.test.ts  # Transaction building and decoding
      contracts.test.ts     # Contract read/call/deploy
    svm/
      balance.test.ts
      transactions.test.ts
      contracts.test.ts
    utxo/
      balance.test.ts
      transactions.test.ts
    tvm/
      balance.test.ts
      transactions.test.ts
      contracts.test.ts
    xrp/
      balance.test.ts
      transactions.test.ts
  mocks/
    rpc-responses.ts        # Shared mock RPC responses
  fixtures/
    addresses.ts            # Test addresses per chain
    transactions.ts         # Serialized tx fixtures
```

### Test Coverage Requirements

- All public API functions
- All error conditions
- Edge cases (zero values, large numbers, invalid addresses)
- Each ecosystem's specific behavior

## Transaction Decoding

The decode function supports two formats:
- **`raw`**: Returns chain-specific decoded transaction with all native fields
- **`normalised`**: Returns unified structure for consistent cross-chain UI rendering

### Raw Transaction Types

#### EVM Raw Transaction

```typescript
export interface RawEvmTransaction {
  _chain: 'evm';
  type: 0 | 1 | 2;                      // Legacy, EIP-2930, EIP-1559
  chainId: number;
  nonce: number;
  to: string | null;                    // null = contract deployment
  value: string;
  data: string;
  gasLimit: string;
  // Legacy (type 0)
  gasPrice?: string;
  // EIP-1559 (type 2)
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  // Access list (type 1, 2)
  accessList?: Array<{ address: string; storageKeys: string[] }>;
  // Signature (if signed)
  v?: number;
  r?: string;
  s?: string;
}
```

#### Solana Raw Transaction

```typescript
export interface RawSolanaTransaction {
  _chain: 'svm';
  version: 'legacy' | 0;
  recentBlockhash: string;
  feePayer: string;
  instructions: Array<{
    programId: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;                       // Base58 encoded
  }>;
  signatures?: string[];
}
```

#### UTXO Raw Transaction

```typescript
export interface RawUtxoTransaction {
  _chain: 'utxo';
  version: number;
  locktime: number;
  isSegwit: boolean;
  inputs: Array<{
    txid: string;
    vout: number;
    scriptSig: string;
    sequence: number;
    witness?: string[];
  }>;
  outputs: Array<{
    value: string;                      // Satoshis
    scriptPubKey: string;
    address?: string;                   // Derived from script if possible
  }>;
}
```

#### TRON Raw Transaction

```typescript
export interface RawTronTransaction {
  _chain: 'tvm';
  txID: string;
  rawData: {
    contract: Array<{
      type: string;
      parameter: {
        value: Record<string, unknown>;
        type_url: string;
      };
    }>;
    refBlockBytes: string;
    refBlockHash: string;
    expiration: number;
    timestamp: number;
    feeLimit?: number;
  };
  signature?: string[];
}
```

#### XRP Raw Transaction

```typescript
export interface RawXrpTransaction {
  _chain: 'xrp';
  TransactionType: string;
  Account: string;
  Destination?: string;
  Amount?: string | { currency: string; issuer: string; value: string };
  Fee: string;
  Sequence: number;
  SigningPubKey?: string;
  TxnSignature?: string;
  Memos?: Array<{ Memo: { MemoType?: string; MemoData?: string } }>;
  DestinationTag?: number;
}
```

### EVM Decoding Implementation

EVM transactions use RLP (Recursive Length Prefix) encoding. Transaction type is determined by the first byte:
- `0x02` = EIP-1559 (type 2)
- `0x01` = EIP-2930 (type 1)
- `0xc0-0xfe` = Legacy (type 0)

```typescript
// Known function selectors for classification
const SELECTORS = {
  // ERC20
  'a9059cbb': { name: 'transfer', sig: 'transfer(address,uint256)' },
  '23b872dd': { name: 'transferFrom', sig: 'transferFrom(address,address,uint256)' },
  '095ea7b3': { name: 'approve', sig: 'approve(address,uint256)' },
  // ERC721
  '42842e0e': { name: 'safeTransferFrom', sig: 'safeTransferFrom(address,address,uint256)' },
  'b88d4fde': { name: 'safeTransferFrom', sig: 'safeTransferFrom(address,address,uint256,bytes)' },
  // ERC1155
  'f242432a': { name: 'safeTransferFrom', sig: 'safeTransferFrom(address,address,uint256,uint256,bytes)' },
  '2eb2c2d6': { name: 'safeBatchTransferFrom', sig: 'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)' },
} as const;

function classifyEvmTransaction(raw: RawEvmTransaction): TransactionType {
  if (raw.to === null) return 'contract-deployment';
  if (!raw.data || raw.data === '0x') return 'native-transfer';

  const selector = raw.data.slice(2, 10).toLowerCase();

  if (selector === 'a9059cbb' || selector === '23b872dd') return 'token-transfer';
  if (selector === '42842e0e' || selector === 'f242432a') return 'nft-transfer';
  if (selector === '095ea7b3') return 'approval';

  return 'contract-call';
}
```

### Solana Decoding Implementation

Solana transactions contain instructions. Each instruction has a program ID that determines its behavior.

```typescript
// Known program IDs
const PROGRAMS = {
  '11111111111111111111111111111111': 'System Program',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': 'Token-2022 Program',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token Program',
  'ComputeBudget111111111111111111111111111111': 'Compute Budget Program',
} as const;

// System Program instruction types
const SYSTEM_INSTRUCTIONS = {
  0: 'CreateAccount',
  1: 'Assign',
  2: 'Transfer',
  3: 'CreateAccountWithSeed',
} as const;

// Token Program instruction types
const TOKEN_INSTRUCTIONS = {
  3: 'Transfer',
  12: 'TransferChecked',
} as const;
```

### UTXO Decoding Implementation

Bitcoin transactions are decoded by parsing:
1. Version (4 bytes, little-endian)
2. SegWit marker/flag (if present: 0x00 0x01)
3. Input count (varint) + inputs
4. Output count (varint) + outputs
5. Witness data (if SegWit)
6. Locktime (4 bytes)

Address derivation from scriptPubKey:
- P2PKH: `OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG`
- P2SH: `OP_HASH160 <20 bytes> OP_EQUAL`
- P2WPKH: `OP_0 <20 bytes>` → bech32
- P2WSH: `OP_0 <32 bytes>` → bech32
- P2TR: `OP_1 <32 bytes>` → bech32m (Taproot)

### Normalisation

Each ecosystem has a normaliser that maps raw transactions to `NormalisedTransaction`:

```typescript
// evm/normalise.ts
export function normaliseEvmTransaction(
  raw: RawEvmTransaction,
  config: ChainConfig
): NormalisedTransaction {
  const { symbol, decimals } = config.nativeCurrency;
  const type = classifyEvmTransaction(raw);
  const tokenTransfer = parseEvmTokenTransfer(raw);
  const contractCall = parseEvmContractCall(raw);

  return {
    chainAlias: config.chainAlias,
    from: '', // Recovered from signature or provided separately
    to: raw.to,
    value: raw.value,
    formattedValue: formatUnits(BigInt(raw.value), decimals),
    symbol,
    type,
    tokenTransfer,
    contractCall,
    data: raw.data !== '0x' ? raw.data : undefined,
    metadata: {
      nonce: raw.nonce,
      isContractDeployment: raw.to === null,
    },
  };
}

// svm/normalise.ts
export function normaliseSolanaTransaction(
  raw: RawSolanaTransaction,
  config: ChainConfig
): NormalisedTransaction {
  const { symbol, decimals } = config.nativeCurrency;
  const { type, transfer, contractCall } = analyseSolanaInstructions(raw.instructions);
  const solTransfer = findSolTransfer(raw.instructions);

  return {
    chainAlias: config.chainAlias,
    from: raw.feePayer,
    to: solTransfer?.to ?? contractCall?.contractAddress ?? null,
    value: solTransfer?.lamports ?? '0',
    formattedValue: formatUnits(BigInt(solTransfer?.lamports ?? '0'), decimals),
    symbol,
    type,
    tokenTransfer: transfer,
    contractCall,
    metadata: { isContractDeployment: false },
  };
}

// utxo/normalise.ts
export function normaliseUtxoTransaction(
  raw: RawUtxoTransaction,
  config: ChainConfig
): NormalisedTransaction {
  const { symbol, decimals } = config.nativeCurrency;
  const totalOutput = raw.outputs.reduce((sum, out) => sum + BigInt(out.value), 0n);

  // Include all outputs for UTXO multi-recipient transactions
  const outputs = raw.outputs.map((out) => ({
    address: out.address ?? null,
    value: out.value,
    formattedValue: formatUnits(BigInt(out.value), decimals),
  }));

  // Primary output is first non-change output (heuristic: largest output)
  const sortedOutputs = [...outputs].sort(
    (a, b) => Number(BigInt(b.value) - BigInt(a.value))
  );
  const primaryOutput = sortedOutputs[0];

  return {
    chainAlias: config.chainAlias,
    from: undefined, // UTXO doesn't have single sender
    to: primaryOutput?.address ?? null,
    value: totalOutput.toString(),
    formattedValue: formatUnits(totalOutput, decimals),
    symbol,
    type: 'native-transfer',
    metadata: {
      isContractDeployment: false,
      inputCount: raw.inputs.length,
      outputCount: raw.outputs.length,
    },
    outputs, // Include all outputs for UI rendering
  };
}

// xrp/normalise.ts
export function normaliseXrpTransaction(
  raw: RawXrpTransaction,
  config: ChainConfig
): NormalisedTransaction {
  const { symbol, decimals } = config.nativeCurrency;
  const type = classifyXrpTransaction(raw.TransactionType);
  const { value, tokenTransfer } = parseXrpAmount(raw.Amount, raw.Destination);
  const memo = raw.Memos?.[0]?.Memo?.MemoData
    ? Buffer.from(raw.Memos[0].Memo.MemoData, 'hex').toString('utf8')
    : undefined;

  return {
    chainAlias: config.chainAlias,
    from: raw.Account,
    to: raw.Destination ?? null,
    value,
    formattedValue: formatUnits(BigInt(value), decimals),
    symbol,
    fee: {
      value: raw.Fee,
      formattedValue: formatUnits(BigInt(raw.Fee), decimals),
      symbol,
    },
    type,
    tokenTransfer,
    metadata: {
      sequence: raw.Sequence,
      memo,
      isContractDeployment: false,
    },
  };
}
```

### Decoding Usage Examples

```typescript
import { decodeTransaction } from '@/packages/chains';

// Raw format - get chain-specific structure
const rawEvm = await decodeTransaction('ethereum', '0x02f8...', 'raw');
// Returns RawEvmTransaction with type, chainId, maxFeePerGas, nonce, etc.

const rawSolana = await decodeTransaction('solana', '5K8s...', 'raw');
// Returns RawSolanaTransaction with instructions, accounts, feePayer, etc.

const rawBitcoin = await decodeTransaction('bitcoin', '0200...', 'raw');
// Returns RawUtxoTransaction with inputs, outputs, witness data, etc.

// Normalised format - unified structure for UI rendering
const normalisedEvm = await decodeTransaction('ethereum', '0x02f8...', 'normalised');
const normalisedSolana = await decodeTransaction('solana', '5K8s...', 'normalised');
const normalisedBitcoin = await decodeTransaction('bitcoin', '0200...', 'normalised');
// All return NormalisedTransaction with same structure:
// { chainAlias, from, to, value, formattedValue, symbol, type, tokenTransfer?, ... }
```

## Transaction Lifecycle

The chains package supports the full transaction lifecycle from building through signing and broadcast.

### Flow Overview

```
1. BUILD
   buildNativeTransfer() / buildTokenTransfer()
   → UnsignedTransaction

2. STORE (optional)
   tx.serialized → database

3. RETRIEVE & RECONSTRUCT (optional)
   parseTransaction(chainAlias, serialized) → UnsignedTransaction

4. REBUILD (optional)
   tx.rebuild({ nonce: newNonce }) → new UnsignedTransaction

5. SIGN
   tx.getSigningPayload() → SigningPayload
   → External MPC/Vault signs payload.data[]
   tx.applySignature(signatures) → SignedTransaction

6. BROADCAST
   signedTx.broadcast() → BroadcastResult
```

### Usage Example

```typescript
import {
  buildNativeTransfer,
  parseTransaction,
  broadcastTransaction,
} from '@/packages/chains';

// 1. Build transaction
const unsignedTx = await buildNativeTransfer('ethereum', {
  from: '0xSender',
  to: '0xRecipient',
  value: '1000000000000000000',
});

// 2. Store serialized tx in database
await db.signRequests.create({
  serialized: unsignedTx.serialized,
  chainAlias: unsignedTx.chainAlias,
});

// ... later, when ready to sign ...

// 3. Retrieve and reconstruct
const stored = await db.signRequests.findById(requestId);
const reconstructedTx = parseTransaction(stored.chainAlias, stored.serialized);

// 4. Rebuild with fresh nonce (if needed)
const currentNonce = await getTransactionCount('ethereum', '0xSender');
const freshTx = reconstructedTx.rebuild({ nonce: currentNonce });

// 5. Get signing payload and sign externally
const payload = freshTx.getSigningPayload();
// payload.data is always string[] - even single items
// payload.algorithm tells you which curve ('secp256k1' or 'ed25519')

// External signing (MPC, hardware wallet, etc.)
const signatures = await externalSigner.sign(payload.data, payload.algorithm);

// 6. Apply signature to create signed transaction
const signedTx = freshTx.applySignature(signatures);

// 7. Broadcast
const result = await signedTx.broadcast();
// or: const result = await broadcastTransaction(chainAlias, signedTx.serialized);

if (result.success) {
  console.log('Transaction hash:', result.hash);
} else {
  console.error('Broadcast failed:', result.error);
}
```

### Rebuild Parameters Per Ecosystem

Each ecosystem has different mutable parameters that can be updated via `rebuild()`:

| Ecosystem | Mutable Parameters | Notes |
|-----------|-------------------|-------|
| EVM | `nonce`, `maxFeePerGas`, `maxPriorityFeePerGas`, `gasLimit` | All gas values in WEI |
| SVM | `recentBlockhash`, `computeUnitLimit`, `computeUnitPrice` | Blockhash expires ~2 minutes |
| UTXO | `feeRate` | May require re-selecting UTXOs |
| TVM | `feeLimit`, `expiration` | Expiration is unix timestamp |
| XRP | `sequence`, `fee`, `lastLedgerSequence` | Fee in drops |
| Substrate | `nonce`, `tip`, `era` | Era for mortality period |

```typescript
// EVM example - update nonce and gas
const rebuilt = tx.rebuild({
  nonce: 42,
  maxFeePerGas: '50000000000',
  maxPriorityFeePerGas: '2000000000',
});

// SVM example - refresh blockhash
const rebuilt = tx.rebuild({
  recentBlockhash: await getRecentBlockhash(),
});

// UTXO example - increase fee rate for faster confirmation
const rebuilt = tx.rebuild({
  feeRate: 50, // sat/vB
});

// XRP example - update sequence
const rebuilt = tx.rebuild({
  sequence: await getAccountSequence(address),
});
```

### Signing Payload Structure

The `getSigningPayload()` method returns data ready for external signing:

```typescript
interface SigningPayload {
  chainAlias: ChainAlias;
  data: string[];              // Always array, even for single signature
  algorithm: 'secp256k1' | 'ed25519';
}
```

**Important**: `data` is always an array to handle ecosystems requiring multiple signatures:
- **EVM**: Single item (transaction hash to sign)
- **SVM**: Single item (message bytes)
- **UTXO**: Multiple items (one sighash per input)
- **TVM**: Single item (transaction hash)
- **XRP**: Single item (transaction hash)
- **Substrate**: Single item (signing payload)

```typescript
const payload = tx.getSigningPayload();

// EVM - single signature
// payload.data = ['0xabc123...'] (tx hash)
// payload.algorithm = 'secp256k1'

// UTXO with 3 inputs - three signatures needed
// payload.data = ['0x111...', '0x222...', '0x333...'] (sighash per input)
// payload.algorithm = 'secp256k1'

// Solana - single signature
// payload.data = ['base58encodedMessage...']
// payload.algorithm = 'ed25519'
```

### Apply Signature

After external signing, apply signatures to create a `SignedTransaction`:

```typescript
// signatures array must match payload.data length
const signedTx = tx.applySignature(signatures);

// SignedTransaction provides:
// - signedTx.serialized: hex/base58 encoded signed tx
// - signedTx.hash: transaction hash (known before broadcast)
// - signedTx.broadcast(): send to network
```

## Broadcast Implementation

### RPC Methods Per Ecosystem

| Ecosystem | RPC Method | Encoding |
|-----------|------------|----------|
| EVM | `eth_sendRawTransaction` | Hex with 0x prefix |
| SVM | `sendTransaction` | Base58 |
| UTXO | Blockbook `sendtx` | Hex |
| TVM | `/wallet/broadcasttransaction` | JSON |
| XRP | `submit` | Hex blob |
| Substrate | `author_submitExtrinsic` | Hex with 0x prefix |

### Broadcast Behavior

- **Returns immediately** after node accepts transaction
- Does **not** wait for confirmation
- Returns `{ hash, success, error? }`

### Error Code Mapping

Each ecosystem maps native RPC errors to `BroadcastErrorCode`:

```typescript
// EVM error mapping
const evmErrorMapping: Record<string, BroadcastErrorCode> = {
  'nonce too low': 'NONCE_TOO_LOW',
  'already known': 'ALREADY_KNOWN',
  'replacement transaction underpriced': 'UNDERPRICED',
  'insufficient funds': 'INSUFFICIENT_FUNDS',
};

// SVM error mapping
const svmErrorMapping: Record<string, BroadcastErrorCode> = {
  'Blockhash not found': 'EXPIRED',
  'Transaction already processed': 'ALREADY_KNOWN',
  'Insufficient funds': 'INSUFFICIENT_FUNDS',
};

// XRP error mapping
const xrpErrorMapping: Record<string, BroadcastErrorCode> = {
  'tefPAST_SEQ': 'SEQUENCE_TOO_LOW',
  'tefALREADY': 'ALREADY_KNOWN',
  'tecUNFUNDED_PAYMENT': 'INSUFFICIENT_FUNDS',
  'tefMAX_LEDGER': 'EXPIRED',
};
```

### Broadcast Example

```typescript
const signedTx = tx.applySignature(signatures);

try {
  const result = await signedTx.broadcast();

  if (result.success) {
    console.log('Broadcast successful:', result.hash);
  } else {
    console.error('Broadcast returned error:', result.error);
  }
} catch (error) {
  if (error instanceof BroadcastError) {
    switch (error.code) {
      case 'NONCE_TOO_LOW':
        // Rebuild with fresh nonce and retry
        break;
      case 'EXPIRED':
        // Rebuild with fresh blockhash/sequence and retry
        break;
      case 'UNDERPRICED':
        // Rebuild with higher gas price and retry
        break;
      case 'INSUFFICIENT_FUNDS':
        // Notify user - can't proceed
        break;
      default:
        // Log and handle unknown error
        break;
    }
  }
  throw error;
}
