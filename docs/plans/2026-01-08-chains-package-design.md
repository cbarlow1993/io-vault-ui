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
 */
export interface NormalisedTransaction {
  chainAlias: ChainAlias;
  hash?: string;
  from: string;
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
    formattedValue?: string;
    symbol?: string;
    decimals?: number;
    tokenId?: string;                   // For NFTs
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
  decode<F extends DecodeFormat>(
    serialized: string,
    format: F
  ): Promise<F extends 'raw' ? RawTransaction : NormalisedTransaction>;
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
export async function decodeTransaction<F extends DecodeFormat>(
  chainAlias: ChainAlias,
  serialized: string,
  format: F,
  rpcUrl?: string
): Promise<F extends 'raw' ? RawTransaction : NormalisedTransaction>;

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
  const primaryOutput = raw.outputs[0];

  return {
    chainAlias: config.chainAlias,
    from: '', // UTXO doesn't have single sender
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
