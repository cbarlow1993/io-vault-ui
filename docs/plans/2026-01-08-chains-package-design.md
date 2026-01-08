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
      errors.ts                 # ChainError, RpcError, etc.
      rpc-client.ts             # Generic JSON-RPC client wrapper
      registry.ts               # Chain registry and ecosystem mapping
      config.ts                 # RPC override configuration
    evm/
      index.ts                  # EVM chain provider factory
      balance.ts                # eth_getBalance, ERC20 balanceOf
      transactions.ts           # EIP-1559 transaction building
      contracts.ts              # Contract read/call/deploy
      config.ts                 # EVM chain configs
    svm/
      index.ts                  # Solana provider factory
      balance.ts                # getBalance, getTokenAccountBalance
      transactions.ts           # Solana transaction building
      contracts.ts              # Program interaction
      config.ts                 # SVM chain configs
    utxo/
      index.ts                  # Bitcoin/UTXO provider factory
      balance.ts                # Blockbook balance
      transactions.ts           # UTXO transaction building
      config.ts                 # UTXO chain configs
    tvm/
      index.ts                  # TRON provider factory
      balance.ts                # TRX and TRC20 balance
      transactions.ts           # TRON transaction building
      contracts.ts              # TVM contract interaction
      config.ts                 # TVM chain configs
    xrp/
      index.ts                  # XRP Ledger provider factory
      balance.ts                # account_info balance
      transactions.ts           # XRP transaction building
      config.ts                 # XRP chain configs
  tests/
    unit/
      core/
      evm/
      svm/
      utxo/
      tvm/
      xrp/
    mocks/
    fixtures/
```

## Core Types

### Chain Aliases

```typescript
export type EvmChainAlias = 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'base' | 'avalanche';
export type SvmChainAlias = 'solana' | 'solana-devnet';
export type UtxoChainAlias = 'bitcoin' | 'bitcoin-testnet';
export type TvmChainAlias = 'tron' | 'tron-testnet';
export type XrpChainAlias = 'xrp' | 'xrp-testnet';

export type ChainAlias = EvmChainAlias | SvmChainAlias | UtxoChainAlias | TvmChainAlias | XrpChainAlias;
export type Ecosystem = 'evm' | 'svm' | 'utxo' | 'tvm' | 'xrp';
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
  chainAlias: ChainAlias;
  raw: unknown;              // Chain-specific raw transaction
  serialized: string;        // Hex/base58 encoded
  hash?: string;
}

export interface DecodedTransaction {
  chainAlias: ChainAlias;
  from?: string;
  to: string;
  value: string;
  formattedValue: string;
  data?: string;
  fee?: string;
  tokenTransfer?: {
    contractAddress: string;
    to: string;
    value: string;
    formattedValue: string;
  };
}

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
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
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
  fee?: string;
}

export type TransactionOverrides =
  | EvmTransactionOverrides
  | SvmTransactionOverrides
  | UtxoTransactionOverrides
  | TvmTransactionOverrides
  | XrpTransactionOverrides;
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
  decode(serialized: string): Promise<DecodedTransaction>;
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

// Balance convenience functions
export async function getNativeBalance(chainAlias: ChainAlias, address: string, rpcUrl?: string): Promise<NativeBalance>;
export async function getTokenBalance(chainAlias: ChainAlias, address: string, contractAddress: string, rpcUrl?: string): Promise<TokenBalance>;

// Transaction convenience functions
export async function buildNativeTransfer(chainAlias: ChainAlias, params: NativeTransferParams, rpcUrl?: string): Promise<UnsignedTransaction>;
export async function buildTokenTransfer(chainAlias: ChainAlias, params: TokenTransferParams, rpcUrl?: string): Promise<UnsignedTransaction>;
export async function decodeTransaction(chainAlias: ChainAlias, serialized: string, rpcUrl?: string): Promise<DecodedTransaction>;

// Contract convenience functions
export async function contractRead(chainAlias: ChainAlias, params: ContractReadParams, rpcUrl?: string): Promise<ContractReadResult>;
export async function contractCall(chainAlias: ChainAlias, params: ContractCallParams, rpcUrl?: string): Promise<UnsignedTransaction>;
export async function contractDeploy(chainAlias: ChainAlias, params: ContractDeployParams, rpcUrl?: string): Promise<DeployedContract>;

// Re-exports
export type { NativeBalance, TokenBalance, BalanceInfo, ChainConfig, ChainAlias, ... };
```

## Error Handling

```typescript
export class ChainError extends Error {
  constructor(message: string, public readonly chainAlias: ChainAlias, public readonly cause?: unknown);
}

export class RpcError extends ChainError {
  constructor(message: string, chainAlias: ChainAlias, public readonly code?: number, cause?: unknown);
}

export class InvalidAddressError extends ChainError {
  constructor(chainAlias: ChainAlias, address: string);
}

export class UnsupportedChainError extends Error {
  constructor(public readonly chainAlias: string);
}

export class UnsupportedOperationError extends ChainError {
  constructor(chainAlias: ChainAlias, operation: string);
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

## Feature Support Matrix

| Feature | EVM | SVM | UTXO | TVM | XRP |
|---------|-----|-----|------|-----|-----|
| getNativeBalance | ✅ | ✅ | ✅ | ✅ | ✅ |
| getTokenBalance | ✅ | ✅ | ❌ | ✅ | ✅ |
| buildNativeTransfer | ✅ | ✅ | ✅ | ✅ | ✅ |
| buildTokenTransfer | ✅ | ✅ | ❌ | ✅ | ✅ |
| decode | ✅ | ✅ | ✅ | ✅ | ✅ |
| contractRead | ✅ | ✅ | ❌ | ✅ | ❌ |
| contractCall | ✅ | ✅ | ❌ | ✅ | ❌ |
| contractDeploy | ✅ | ✅ | ❌ | ✅ | ❌ |

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
