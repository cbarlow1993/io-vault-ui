# Chains Package Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the internal `/packages/chains` package providing a unified interface for blockchain operations across 6 ecosystems (EVM, SVM, UTXO, TVM, XRP, Substrate).

**Architecture:** RPC-first approach with provider caching, unified transaction lifecycle (build → store → reconstruct → rebuild → sign → broadcast), and ecosystem-specific implementations behind common interfaces.

**Tech Stack:** TypeScript, ESM, vitest for testing, viem/ethers (EVM), @solana/web3.js (SVM), @iofinnet/bitcoinjs-lib (UTXO), @polkadot/api (Substrate), zod for validation.

---

## Phase 1: Core Foundation

### Task 1.1: Package Scaffolding

**Files:**
- Create: `packages/chains/package.json`
- Create: `packages/chains/tsconfig.json`
- Create: `packages/chains/src/index.ts`
- Create: `packages/chains/vitest.config.ts`

**Step 1: Create packages directory and package.json**

```bash
mkdir -p packages/chains/src
```

```json
// packages/chains/package.json
{
  "name": "@io-vault/chains",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "viem": "^2.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  },
  "peerDependencies": {
    "@solana/web3.js": "^1.95.0",
    "@polkadot/api": "^10.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
// packages/chains/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 3: Create vitest config**

```typescript
// packages/chains/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

**Step 4: Create placeholder index.ts**

```typescript
// packages/chains/src/index.ts
export const VERSION = '0.0.1';
```

**Step 5: Verify setup compiles**

Run: `cd packages/chains && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add packages/chains
git commit -m "feat(chains): scaffold package structure"
```

---

### Task 1.2: Core Types

**Files:**
- Create: `packages/chains/src/core/types.ts`
- Create: `packages/chains/tests/unit/core/types.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/chains/tests/unit/core/types.test.ts
import { describe, it, expect } from 'vitest';
import {
  CHAIN_ECOSYSTEM_MAP,
  type ChainAlias,
  type Ecosystem,
  type EvmChainAlias,
  type SvmChainAlias,
  type UtxoChainAlias,
} from '../../src/core/types.js';

describe('Core Types', () => {
  describe('CHAIN_ECOSYSTEM_MAP', () => {
    it('maps ethereum to evm ecosystem', () => {
      expect(CHAIN_ECOSYSTEM_MAP.ethereum).toBe('evm');
    });

    it('maps solana to svm ecosystem', () => {
      expect(CHAIN_ECOSYSTEM_MAP.solana).toBe('svm');
    });

    it('maps bitcoin to utxo ecosystem', () => {
      expect(CHAIN_ECOSYSTEM_MAP.bitcoin).toBe('utxo');
    });

    it('maps tron to tvm ecosystem', () => {
      expect(CHAIN_ECOSYSTEM_MAP.tron).toBe('tvm');
    });

    it('maps xrp to xrp ecosystem', () => {
      expect(CHAIN_ECOSYSTEM_MAP.xrp).toBe('xrp');
    });

    it('maps bittensor to substrate ecosystem', () => {
      expect(CHAIN_ECOSYSTEM_MAP.bittensor).toBe('substrate');
    });
  });

  describe('Type Guards', () => {
    it('ChainAlias type includes all chain aliases', () => {
      const chains: ChainAlias[] = [
        'ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'bsc',
        'solana', 'solana-devnet',
        'bitcoin', 'bitcoin-testnet', 'mnee',
        'tron', 'tron-testnet',
        'xrp', 'xrp-testnet',
        'bittensor', 'bittensor-testnet',
      ];
      expect(chains.length).toBe(18);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/chains && npx vitest run tests/unit/core/types.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Create core directory and implement types**

```typescript
// packages/chains/src/core/types.ts

// ============ Chain Alias Types ============

export type EvmChainAlias =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'avalanche'
  | 'bsc';

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

// ============ Chain Ecosystem Mapping ============

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

// ============ Balance Types ============

export interface BalanceInfo {
  balance: string;
  formattedBalance: string;
  symbol: string;
  decimals: number;
}

export interface NativeBalance extends BalanceInfo {}

export interface TokenBalance extends BalanceInfo {
  contractAddress: string;
  name?: string;
  logoUri?: string;
}

// ============ Chain Config ============

export interface ChainConfig {
  chainAlias: ChainAlias;
  rpcUrl: string;
  nativeCurrency: { symbol: string; decimals: number };
  chainId?: number;
  supportsEip1559?: boolean;
}

// ============ Transaction Types ============

export type DecodeFormat = 'raw' | 'normalised';

export type TransactionType =
  | 'native-transfer'
  | 'token-transfer'
  | 'nft-transfer'
  | 'contract-call'
  | 'contract-deployment'
  | 'approval'
  | 'unknown';

export interface SigningPayload {
  chainAlias: ChainAlias;
  data: string[];
  algorithm: 'secp256k1' | 'ed25519';
}

export interface BroadcastResult {
  hash: string;
  success: boolean;
  error?: string;
}

// ============ Fee Estimate Types ============

export interface FeeEstimate {
  slow: { fee: string; formattedFee: string };
  standard: { fee: string; formattedFee: string };
  fast: { fee: string; formattedFee: string };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/chains && npx vitest run tests/unit/core/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/chains/src/core/types.ts packages/chains/tests/unit/core/types.test.ts
git commit -m "feat(chains): add core types and chain alias mapping"
```

---

### Task 1.3: Transaction Override Types

**Files:**
- Modify: `packages/chains/src/core/types.ts`
- Create: `packages/chains/tests/unit/core/overrides.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/chains/tests/unit/core/overrides.test.ts
import { describe, it, expect } from 'vitest';
import type {
  TransactionOverrides,
  EvmTransactionOverrides,
  SvmTransactionOverrides,
  UtxoTransactionOverrides,
  TvmTransactionOverrides,
  XrpTransactionOverrides,
  SubstrateTransactionOverrides,
} from '../../src/core/types.js';

describe('Transaction Overrides', () => {
  it('EvmTransactionOverrides accepts valid EVM override fields', () => {
    const overrides: EvmTransactionOverrides = {
      nonce: 42,
      maxFeePerGas: '50000000000',
      maxPriorityFeePerGas: '2000000000',
      gasLimit: '21000',
    };
    expect(overrides.nonce).toBe(42);
  });

  it('SvmTransactionOverrides accepts valid Solana override fields', () => {
    const overrides: SvmTransactionOverrides = {
      recentBlockhash: 'abc123',
      computeUnitLimit: 200000,
      computeUnitPrice: 1000,
    };
    expect(overrides.computeUnitLimit).toBe(200000);
  });

  it('UtxoTransactionOverrides accepts valid UTXO override fields', () => {
    const overrides: UtxoTransactionOverrides = {
      feeRate: 10,
    };
    expect(overrides.feeRate).toBe(10);
  });

  it('TransactionOverrides union accepts any ecosystem override', () => {
    const evmOverride: TransactionOverrides = { nonce: 1 };
    const svmOverride: TransactionOverrides = { recentBlockhash: 'xyz' };
    const utxoOverride: TransactionOverrides = { feeRate: 5 };
    expect(evmOverride).toBeDefined();
    expect(svmOverride).toBeDefined();
    expect(utxoOverride).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/chains && npx vitest run tests/unit/core/overrides.test.ts`
Expected: FAIL with "Cannot find module" or type errors

**Step 3: Add override types to types.ts**

Add to `packages/chains/src/core/types.ts`:

```typescript
// ============ Transaction Override Types ============

export interface EvmTransactionOverrides {
  nonce?: number;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasLimit?: string;
}

export interface SvmTransactionOverrides {
  recentBlockhash?: string;
  computeUnitLimit?: number;
  computeUnitPrice?: number;
}

export interface UtxoTransactionOverrides {
  feeRate?: number;
}

export interface TvmTransactionOverrides {
  feeLimit?: number;
  expiration?: number;
}

export interface XrpTransactionOverrides {
  sequence?: number;
  fee?: string;
  lastLedgerSequence?: number;
}

export interface SubstrateTransactionOverrides {
  tip?: string;
  nonce?: number;
  era?: number;
}

export interface EcosystemOverridesMap {
  evm: EvmTransactionOverrides;
  svm: SvmTransactionOverrides;
  utxo: UtxoTransactionOverrides;
  tvm: TvmTransactionOverrides;
  xrp: XrpTransactionOverrides;
  substrate: SubstrateTransactionOverrides;
}

export type TransactionOverrides =
  | EvmTransactionOverrides
  | SvmTransactionOverrides
  | UtxoTransactionOverrides
  | TvmTransactionOverrides
  | XrpTransactionOverrides
  | SubstrateTransactionOverrides;
```

**Step 4: Run test to verify it passes**

Run: `cd packages/chains && npx vitest run tests/unit/core/overrides.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/chains/src/core/types.ts packages/chains/tests/unit/core/overrides.test.ts
git commit -m "feat(chains): add transaction override types per ecosystem"
```

---

### Task 1.4: Error Classes

**Files:**
- Create: `packages/chains/src/core/errors.ts`
- Create: `packages/chains/tests/unit/core/errors.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/chains/tests/unit/core/errors.test.ts
import { describe, it, expect } from 'vitest';
import {
  ChainError,
  RpcError,
  RpcTimeoutError,
  RateLimitError,
  InvalidAddressError,
  InvalidTransactionError,
  InsufficientBalanceError,
  UnsupportedChainError,
  UnsupportedOperationError,
  BroadcastError,
} from '../../src/core/errors.js';

describe('Error Classes', () => {
  describe('ChainError', () => {
    it('creates error with chainAlias and message', () => {
      const error = new ChainError('Test error', 'ethereum');
      expect(error.message).toBe('Test error');
      expect(error.chainAlias).toBe('ethereum');
      expect(error.name).toBe('ChainError');
    });

    it('preserves cause when provided', () => {
      const cause = new Error('Original error');
      const error = new ChainError('Wrapped error', 'polygon', cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('RpcError', () => {
    it('extends ChainError with code', () => {
      const error = new RpcError('RPC failed', 'ethereum', -32000);
      expect(error.code).toBe(-32000);
      expect(error.name).toBe('RpcError');
      expect(error).toBeInstanceOf(ChainError);
    });
  });

  describe('RpcTimeoutError', () => {
    it('creates timeout error with duration', () => {
      const error = new RpcTimeoutError('solana', 5000);
      expect(error.message).toBe('RPC request timed out after 5000ms');
      expect(error.name).toBe('RpcTimeoutError');
    });
  });

  describe('RateLimitError', () => {
    it('creates rate limit error with retry info', () => {
      const error = new RateLimitError('ethereum', 1000);
      expect(error.message).toContain('retry after 1000ms');
      expect(error.code).toBe(429);
    });
  });

  describe('InvalidAddressError', () => {
    it('includes the invalid address in message', () => {
      const error = new InvalidAddressError('bitcoin', 'not-an-address');
      expect(error.message).toContain('not-an-address');
      expect(error.address).toBe('not-an-address');
    });
  });

  describe('InsufficientBalanceError', () => {
    it('includes required and available amounts', () => {
      const error = new InsufficientBalanceError('ethereum', '1000', '500');
      expect(error.required).toBe('1000');
      expect(error.available).toBe('500');
      expect(error.message).toContain('1000');
      expect(error.message).toContain('500');
    });
  });

  describe('UnsupportedChainError', () => {
    it('does not extend ChainError (no valid chainAlias)', () => {
      const error = new UnsupportedChainError('fake-chain');
      expect(error.chainAlias).toBe('fake-chain');
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(ChainError);
    });
  });

  describe('BroadcastError', () => {
    it('includes broadcast error code', () => {
      const error = new BroadcastError('Nonce too low', 'ethereum', 'NONCE_TOO_LOW');
      expect(error.code).toBe('NONCE_TOO_LOW');
      expect(error.name).toBe('BroadcastError');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/chains && npx vitest run tests/unit/core/errors.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Implement error classes**

```typescript
// packages/chains/src/core/errors.ts
import type { ChainAlias } from './types.js';

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

export type BroadcastErrorCode =
  | 'ALREADY_KNOWN'
  | 'NONCE_TOO_LOW'
  | 'SEQUENCE_TOO_LOW'
  | 'INSUFFICIENT_FUNDS'
  | 'UNDERPRICED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'NETWORK_ERROR';

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

**Step 4: Run test to verify it passes**

Run: `cd packages/chains && npx vitest run tests/unit/core/errors.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/chains/src/core/errors.ts packages/chains/tests/unit/core/errors.test.ts
git commit -m "feat(chains): add comprehensive error classes"
```

---

### Task 1.5: Interfaces

**Files:**
- Create: `packages/chains/src/core/interfaces.ts`
- Create: `packages/chains/tests/unit/core/interfaces.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/chains/tests/unit/core/interfaces.test.ts
import { describe, it, expect } from 'vitest';
import type {
  IBalanceFetcher,
  ITransactionBuilder,
  IContractInteraction,
  IChainProvider,
  UnsignedTransaction,
  SignedTransaction,
  NativeTransferParams,
  TokenTransferParams,
  ContractReadParams,
  ContractCallParams,
} from '../../src/core/interfaces.js';

describe('Interfaces', () => {
  it('UnsignedTransaction has required methods', () => {
    // Type-level test: ensure interface shape is correct
    const mockTx: UnsignedTransaction = {
      chainAlias: 'ethereum',
      raw: {},
      serialized: '0x...',
      rebuild: () => mockTx,
      getSigningPayload: () => ({ chainAlias: 'ethereum', data: ['0x'], algorithm: 'secp256k1' }),
      applySignature: () => ({
        chainAlias: 'ethereum',
        serialized: '0x...',
        hash: '0x...',
        broadcast: async () => ({ hash: '0x', success: true }),
      }),
      toNormalised: () => ({
        chainAlias: 'ethereum',
        to: '0x...',
        value: '0',
        formattedValue: '0',
        symbol: 'ETH',
        type: 'native-transfer',
        metadata: { isContractDeployment: false },
      }),
    };
    expect(mockTx.chainAlias).toBe('ethereum');
    expect(typeof mockTx.rebuild).toBe('function');
    expect(typeof mockTx.getSigningPayload).toBe('function');
    expect(typeof mockTx.applySignature).toBe('function');
  });

  it('NativeTransferParams has required fields', () => {
    const params: NativeTransferParams = {
      from: '0xSender',
      to: '0xRecipient',
      value: '1000000000000000000',
    };
    expect(params.from).toBeDefined();
    expect(params.to).toBeDefined();
    expect(params.value).toBeDefined();
  });

  it('TokenTransferParams extends NativeTransferParams with contractAddress', () => {
    const params: TokenTransferParams = {
      from: '0xSender',
      to: '0xRecipient',
      value: '1000000',
      contractAddress: '0xToken',
    };
    expect(params.contractAddress).toBe('0xToken');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/chains && npx vitest run tests/unit/core/interfaces.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Implement interfaces**

```typescript
// packages/chains/src/core/interfaces.ts
import type {
  ChainAlias,
  ChainConfig,
  NativeBalance,
  TokenBalance,
  SigningPayload,
  BroadcastResult,
  TransactionOverrides,
  TransactionType,
  DecodeFormat,
  FeeEstimate,
} from './types.js';

// ============ Normalised Transaction ============

export interface NormalisedTransaction {
  chainAlias: ChainAlias;
  hash?: string;
  from?: string;
  to: string | null;
  value: string;
  formattedValue: string;
  symbol: string;
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
    formattedValue: string;
    symbol: string;
    decimals: number;
    tokenId?: string;
  };
  contractCall?: {
    contractAddress: string;
    method?: string;
    selector?: string;
  };
  data?: string;
  metadata: {
    nonce?: number;
    sequence?: number;
    memo?: string;
    isContractDeployment: boolean;
    inputCount?: number;
    outputCount?: number;
  };
  outputs?: Array<{
    address: string | null;
    value: string;
    formattedValue: string;
  }>;
}

// ============ Transaction Interfaces ============

export interface UnsignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly raw: unknown;
  readonly serialized: string;

  rebuild(overrides: TransactionOverrides): UnsignedTransaction;
  getSigningPayload(): SigningPayload;
  applySignature(signatures: string[]): SignedTransaction;
  toNormalised(): NormalisedTransaction;
}

export interface SignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly serialized: string;
  readonly hash: string;

  broadcast(rpcUrl?: string): Promise<BroadcastResult>;
}

// ============ Transfer Params ============

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

// ============ Contract Params ============

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

// ============ Raw Transaction Types ============

export interface RawEvmTransaction {
  _chain: 'evm';
  type: 0 | 1 | 2;
  chainId: number;
  nonce: number;
  to: string | null;
  value: string;
  data: string;
  gasLimit: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  accessList?: Array<{ address: string; storageKeys: string[] }>;
  v?: number;
  r?: string;
  s?: string;
}

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
    data: string;
  }>;
  signatures?: string[];
}

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
    value: string;
    scriptPubKey: string;
    address?: string;
  }>;
}

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

export type RawTransaction =
  | RawEvmTransaction
  | RawSolanaTransaction
  | RawUtxoTransaction
  | RawTronTransaction
  | RawXrpTransaction;

// ============ Provider Interfaces ============

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

**Step 4: Run test to verify it passes**

Run: `cd packages/chains && npx vitest run tests/unit/core/interfaces.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/chains/src/core/interfaces.ts packages/chains/tests/unit/core/interfaces.test.ts
git commit -m "feat(chains): add transaction and provider interfaces"
```

---

### Task 1.6: Registry and Utility Functions

**Files:**
- Create: `packages/chains/src/core/registry.ts`
- Create: `packages/chains/tests/unit/core/registry.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/chains/tests/unit/core/registry.test.ts
import { describe, it, expect } from 'vitest';
import {
  getEcosystem,
  isValidChainAlias,
  isValidEcosystem,
  getAllChainAliases,
  getChainAliasesByEcosystem,
} from '../../src/core/registry.js';

describe('Registry', () => {
  describe('getEcosystem', () => {
    it('returns evm for ethereum', () => {
      expect(getEcosystem('ethereum')).toBe('evm');
    });

    it('returns svm for solana', () => {
      expect(getEcosystem('solana')).toBe('svm');
    });

    it('returns utxo for bitcoin', () => {
      expect(getEcosystem('bitcoin')).toBe('utxo');
    });

    it('returns tvm for tron', () => {
      expect(getEcosystem('tron')).toBe('tvm');
    });

    it('returns xrp for xrp', () => {
      expect(getEcosystem('xrp')).toBe('xrp');
    });

    it('returns substrate for bittensor', () => {
      expect(getEcosystem('bittensor')).toBe('substrate');
    });
  });

  describe('isValidChainAlias', () => {
    it('returns true for valid chain aliases', () => {
      expect(isValidChainAlias('ethereum')).toBe(true);
      expect(isValidChainAlias('solana')).toBe(true);
      expect(isValidChainAlias('bitcoin')).toBe(true);
    });

    it('returns false for invalid chain aliases', () => {
      expect(isValidChainAlias('fake-chain')).toBe(false);
      expect(isValidChainAlias('')).toBe(false);
      expect(isValidChainAlias('ETHEREUM')).toBe(false);
    });
  });

  describe('isValidEcosystem', () => {
    it('returns true for valid ecosystems', () => {
      expect(isValidEcosystem('evm')).toBe(true);
      expect(isValidEcosystem('svm')).toBe(true);
      expect(isValidEcosystem('utxo')).toBe(true);
    });

    it('returns false for invalid ecosystems', () => {
      expect(isValidEcosystem('fake')).toBe(false);
      expect(isValidEcosystem('')).toBe(false);
    });
  });

  describe('getAllChainAliases', () => {
    it('returns all 18 chain aliases', () => {
      const aliases = getAllChainAliases();
      expect(aliases.length).toBe(18);
      expect(aliases).toContain('ethereum');
      expect(aliases).toContain('solana');
      expect(aliases).toContain('bitcoin');
    });
  });

  describe('getChainAliasesByEcosystem', () => {
    it('returns all EVM chains for evm ecosystem', () => {
      const evmChains = getChainAliasesByEcosystem('evm');
      expect(evmChains).toContain('ethereum');
      expect(evmChains).toContain('polygon');
      expect(evmChains).toContain('arbitrum');
      expect(evmChains.length).toBe(7);
    });

    it('returns solana chains for svm ecosystem', () => {
      const svmChains = getChainAliasesByEcosystem('svm');
      expect(svmChains).toContain('solana');
      expect(svmChains).toContain('solana-devnet');
      expect(svmChains.length).toBe(2);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/chains && npx vitest run tests/unit/core/registry.test.ts`
Expected: FAIL

**Step 3: Implement registry**

```typescript
// packages/chains/src/core/registry.ts
import { CHAIN_ECOSYSTEM_MAP, type ChainAlias, type Ecosystem } from './types.js';

const VALID_ECOSYSTEMS: readonly Ecosystem[] = ['evm', 'svm', 'utxo', 'tvm', 'xrp', 'substrate'];

export function getEcosystem(chainAlias: ChainAlias): Ecosystem {
  return CHAIN_ECOSYSTEM_MAP[chainAlias];
}

export function isValidChainAlias(value: string): value is ChainAlias {
  return value in CHAIN_ECOSYSTEM_MAP;
}

export function isValidEcosystem(value: string): value is Ecosystem {
  return VALID_ECOSYSTEMS.includes(value as Ecosystem);
}

export function getAllChainAliases(): ChainAlias[] {
  return Object.keys(CHAIN_ECOSYSTEM_MAP) as ChainAlias[];
}

export function getChainAliasesByEcosystem(ecosystem: Ecosystem): ChainAlias[] {
  return getAllChainAliases().filter(
    (chainAlias) => CHAIN_ECOSYSTEM_MAP[chainAlias] === ecosystem
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/chains && npx vitest run tests/unit/core/registry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/chains/src/core/registry.ts packages/chains/tests/unit/core/registry.test.ts
git commit -m "feat(chains): add chain registry and utility functions"
```

---

### Task 1.7: Provider Cache

**Files:**
- Create: `packages/chains/src/core/provider-cache.ts`
- Create: `packages/chains/tests/unit/core/provider-cache.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/chains/tests/unit/core/provider-cache.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProviderCache } from '../../src/core/provider-cache.js';
import type { IChainProvider } from '../../src/core/interfaces.js';

describe('ProviderCache', () => {
  let cache: ProviderCache;

  beforeEach(() => {
    cache = new ProviderCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockProvider = (chainAlias: string): IChainProvider => ({
    chainAlias,
    config: { chainAlias, rpcUrl: '', nativeCurrency: { symbol: 'ETH', decimals: 18 } },
  } as IChainProvider);

  it('caches provider by chainAlias:rpcUrl key', () => {
    const provider = createMockProvider('ethereum');
    cache.set('ethereum', 'https://rpc.example.com', provider);

    const cached = cache.get('ethereum', 'https://rpc.example.com');
    expect(cached).toBe(provider);
  });

  it('returns undefined for uncached provider', () => {
    const cached = cache.get('ethereum', 'https://rpc.example.com');
    expect(cached).toBeUndefined();
  });

  it('returns undefined for expired cache entry', () => {
    const provider = createMockProvider('ethereum');
    cache.set('ethereum', 'https://rpc.example.com', provider);

    // Advance time past cache TTL (5 minutes)
    vi.advanceTimersByTime(6 * 60 * 1000);

    const cached = cache.get('ethereum', 'https://rpc.example.com');
    expect(cached).toBeUndefined();
  });

  it('clear() removes all entries', () => {
    cache.set('ethereum', 'https://rpc1.com', createMockProvider('ethereum'));
    cache.set('polygon', 'https://rpc2.com', createMockProvider('polygon'));

    cache.clear();

    expect(cache.get('ethereum', 'https://rpc1.com')).toBeUndefined();
    expect(cache.get('polygon', 'https://rpc2.com')).toBeUndefined();
  });

  it('clearChain() removes entries for specific chain only', () => {
    cache.set('ethereum', 'https://rpc1.com', createMockProvider('ethereum'));
    cache.set('ethereum', 'https://rpc2.com', createMockProvider('ethereum'));
    cache.set('polygon', 'https://rpc3.com', createMockProvider('polygon'));

    cache.clearChain('ethereum');

    expect(cache.get('ethereum', 'https://rpc1.com')).toBeUndefined();
    expect(cache.get('ethereum', 'https://rpc2.com')).toBeUndefined();
    expect(cache.get('polygon', 'https://rpc3.com')).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/chains && npx vitest run tests/unit/core/provider-cache.test.ts`
Expected: FAIL

**Step 3: Implement provider cache**

```typescript
// packages/chains/src/core/provider-cache.ts
import type { ChainAlias } from './types.js';
import type { IChainProvider } from './interfaces.js';

interface CachedEntry {
  provider: IChainProvider;
  createdAt: number;
}

export class ProviderCache {
  private cache = new Map<string, CachedEntry>();
  private readonly maxAge: number;

  constructor(maxAgeMs: number = 5 * 60 * 1000) {
    this.maxAge = maxAgeMs;
  }

  private getKey(chainAlias: ChainAlias, rpcUrl: string): string {
    return `${chainAlias}:${rpcUrl}`;
  }

  get(chainAlias: ChainAlias, rpcUrl: string): IChainProvider | undefined {
    const key = this.getKey(chainAlias, rpcUrl);
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() - entry.createdAt >= this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.provider;
  }

  set(chainAlias: ChainAlias, rpcUrl: string, provider: IChainProvider): void {
    const key = this.getKey(chainAlias, rpcUrl);
    this.cache.set(key, {
      provider,
      createdAt: Date.now(),
    });
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

**Step 4: Run test to verify it passes**

Run: `cd packages/chains && npx vitest run tests/unit/core/provider-cache.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/chains/src/core/provider-cache.ts packages/chains/tests/unit/core/provider-cache.test.ts
git commit -m "feat(chains): add provider cache with TTL expiration"
```

---

### Task 1.8: Core Index and Exports

**Files:**
- Create: `packages/chains/src/core/index.ts`
- Modify: `packages/chains/src/index.ts`

**Step 1: Create core index**

```typescript
// packages/chains/src/core/index.ts
export * from './types.js';
export * from './interfaces.js';
export * from './errors.js';
export * from './registry.js';
export { ProviderCache, providerCache } from './provider-cache.js';
```

**Step 2: Update main index**

```typescript
// packages/chains/src/index.ts
export * from './core/index.js';

export const VERSION = '0.0.1';
```

**Step 3: Verify all exports work**

Run: `cd packages/chains && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/chains/src/core/index.ts packages/chains/src/index.ts
git commit -m "feat(chains): add core module exports"
```

---

## Phase 2: EVM Implementation

### Task 2.1: EVM Chain Configs

**Files:**
- Create: `packages/chains/src/evm/config.ts`
- Create: `packages/chains/tests/unit/evm/config.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/chains/tests/unit/evm/config.test.ts
import { describe, it, expect } from 'vitest';
import { EVM_CHAIN_CONFIGS, getEvmChainConfig } from '../../src/evm/config.js';
import type { EvmChainAlias } from '../../src/core/types.js';

describe('EVM Chain Configs', () => {
  describe('EVM_CHAIN_CONFIGS', () => {
    it('has config for ethereum', () => {
      expect(EVM_CHAIN_CONFIGS.ethereum).toBeDefined();
      expect(EVM_CHAIN_CONFIGS.ethereum.chainId).toBe(1);
      expect(EVM_CHAIN_CONFIGS.ethereum.nativeCurrency.symbol).toBe('ETH');
    });

    it('has config for polygon', () => {
      expect(EVM_CHAIN_CONFIGS.polygon).toBeDefined();
      expect(EVM_CHAIN_CONFIGS.polygon.chainId).toBe(137);
      expect(EVM_CHAIN_CONFIGS.polygon.nativeCurrency.symbol).toBe('POL');
    });

    it('has config for arbitrum', () => {
      expect(EVM_CHAIN_CONFIGS.arbitrum).toBeDefined();
      expect(EVM_CHAIN_CONFIGS.arbitrum.chainId).toBe(42161);
    });

    it('has config for all 7 EVM chains', () => {
      const chainAliases: EvmChainAlias[] = [
        'ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'bsc'
      ];
      chainAliases.forEach(alias => {
        expect(EVM_CHAIN_CONFIGS[alias]).toBeDefined();
      });
    });
  });

  describe('getEvmChainConfig', () => {
    it('returns config for valid chain alias', () => {
      const config = getEvmChainConfig('ethereum');
      expect(config.chainAlias).toBe('ethereum');
      expect(config.chainId).toBe(1);
    });

    it('applies rpc override when provided', () => {
      const customRpc = 'https://custom-rpc.example.com';
      const config = getEvmChainConfig('ethereum', customRpc);
      expect(config.rpcUrl).toBe(customRpc);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/chains && npx vitest run tests/unit/evm/config.test.ts`
Expected: FAIL

**Step 3: Implement EVM configs**

```typescript
// packages/chains/src/evm/config.ts
import type { ChainConfig, EvmChainAlias } from '../core/types.js';

export interface EvmChainConfig extends ChainConfig {
  chainAlias: EvmChainAlias;
  chainId: number;
  supportsEip1559: boolean;
}

export const EVM_CHAIN_CONFIGS: Record<EvmChainAlias, EvmChainConfig> = {
  ethereum: {
    chainAlias: 'ethereum',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  },
  polygon: {
    chainAlias: 'polygon',
    chainId: 137,
    rpcUrl: 'https://polygon.llamarpc.com',
    nativeCurrency: { symbol: 'POL', decimals: 18 },
    supportsEip1559: true,
  },
  arbitrum: {
    chainAlias: 'arbitrum',
    chainId: 42161,
    rpcUrl: 'https://arbitrum.llamarpc.com',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  },
  optimism: {
    chainAlias: 'optimism',
    chainId: 10,
    rpcUrl: 'https://optimism.llamarpc.com',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  },
  base: {
    chainAlias: 'base',
    chainId: 8453,
    rpcUrl: 'https://base.llamarpc.com',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  },
  avalanche: {
    chainAlias: 'avalanche',
    chainId: 43114,
    rpcUrl: 'https://avalanche.public-rpc.com',
    nativeCurrency: { symbol: 'AVAX', decimals: 18 },
    supportsEip1559: true,
  },
  bsc: {
    chainAlias: 'bsc',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    nativeCurrency: { symbol: 'BNB', decimals: 18 },
    supportsEip1559: false,
  },
};

export function getEvmChainConfig(
  chainAlias: EvmChainAlias,
  rpcUrl?: string
): EvmChainConfig {
  const config = EVM_CHAIN_CONFIGS[chainAlias];
  if (rpcUrl) {
    return { ...config, rpcUrl };
  }
  return config;
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/chains && npx vitest run tests/unit/evm/config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/chains/src/evm/config.ts packages/chains/tests/unit/evm/config.test.ts
git commit -m "feat(chains): add EVM chain configurations"
```

---

### Task 2.2: EVM Balance Fetching

**Files:**
- Create: `packages/chains/src/evm/balance.ts`
- Create: `packages/chains/tests/unit/evm/balance.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/chains/tests/unit/evm/balance.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvmBalanceFetcher } from '../../src/evm/balance.js';
import type { EvmChainConfig } from '../../src/evm/config.js';

describe('EvmBalanceFetcher', () => {
  const mockConfig: EvmChainConfig = {
    chainAlias: 'ethereum',
    chainId: 1,
    rpcUrl: 'https://test-rpc.com',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  };

  let fetcher: EvmBalanceFetcher;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    fetcher = new EvmBalanceFetcher(mockConfig);
  });

  describe('getNativeBalance', () => {
    it('returns formatted native balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: '0xde0b6b3a7640000', // 1 ETH in wei
        }),
      });

      const result = await fetcher.getNativeBalance('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');

      expect(result.balance).toBe('1000000000000000000');
      expect(result.formattedBalance).toBe('1');
      expect(result.symbol).toBe('ETH');
      expect(result.decimals).toBe(18);
    });

    it('handles zero balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: '0x0',
        }),
      });

      const result = await fetcher.getNativeBalance('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');

      expect(result.balance).toBe('0');
      expect(result.formattedBalance).toBe('0');
    });
  });

  describe('getTokenBalance', () => {
    it('returns formatted token balance', async () => {
      // Mock balanceOf call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: '0x0000000000000000000000000000000000000000000000000000000005f5e100', // 100 USDC
        }),
      });

      // Mock decimals call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 2,
          result: '0x0000000000000000000000000000000000000000000000000000000000000006', // 6 decimals
        }),
      });

      // Mock symbol call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 3,
          result: '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000455534443', // USDC
        }),
      });

      const result = await fetcher.getTokenBalance(
        '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );

      expect(result.balance).toBe('100000000');
      expect(result.decimals).toBe(6);
      expect(result.contractAddress).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/chains && npx vitest run tests/unit/evm/balance.test.ts`
Expected: FAIL

**Step 3: Implement EVM balance fetcher**

```typescript
// packages/chains/src/evm/balance.ts
import type { NativeBalance, TokenBalance } from '../core/types.js';
import type { IBalanceFetcher } from '../core/interfaces.js';
import { RpcError } from '../core/errors.js';
import type { EvmChainConfig } from './config.js';
import { formatUnits } from './utils.js';

export class EvmBalanceFetcher implements IBalanceFetcher {
  constructor(private readonly config: EvmChainConfig) {}

  async getNativeBalance(address: string): Promise<NativeBalance> {
    const result = await this.rpcCall('eth_getBalance', [address, 'latest']);
    const balanceWei = BigInt(result);

    return {
      balance: balanceWei.toString(),
      formattedBalance: formatUnits(balanceWei, this.config.nativeCurrency.decimals),
      symbol: this.config.nativeCurrency.symbol,
      decimals: this.config.nativeCurrency.decimals,
    };
  }

  async getTokenBalance(address: string, contractAddress: string): Promise<TokenBalance> {
    // balanceOf(address)
    const balanceOfSelector = '0x70a08231';
    const paddedAddress = address.toLowerCase().replace('0x', '').padStart(64, '0');
    const balanceData = balanceOfSelector + paddedAddress;

    const [balanceResult, decimalsResult, symbolResult] = await Promise.all([
      this.rpcCall('eth_call', [{ to: contractAddress, data: balanceData }, 'latest']),
      this.rpcCall('eth_call', [{ to: contractAddress, data: '0x313ce567' }, 'latest']), // decimals()
      this.rpcCall('eth_call', [{ to: contractAddress, data: '0x95d89b41' }, 'latest']), // symbol()
    ]);

    const balance = BigInt(balanceResult);
    const decimals = parseInt(decimalsResult, 16);
    const symbol = this.decodeString(symbolResult);

    return {
      balance: balance.toString(),
      formattedBalance: formatUnits(balance, decimals),
      symbol,
      decimals,
      contractAddress,
    };
  }

  private async rpcCall(method: string, params: unknown[]): Promise<string> {
    const response = await fetch(this.config.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new RpcError(`RPC request failed: ${response.statusText}`, this.config.chainAlias);
    }

    const json = await response.json();

    if (json.error) {
      throw new RpcError(json.error.message, this.config.chainAlias, json.error.code);
    }

    return json.result;
  }

  private decodeString(hex: string): string {
    if (hex === '0x' || hex.length < 66) return '';

    try {
      // ABI-encoded string: offset (32 bytes) + length (32 bytes) + data
      const lengthHex = hex.slice(66, 130);
      const length = parseInt(lengthHex, 16);
      const dataHex = hex.slice(130, 130 + length * 2);

      let result = '';
      for (let i = 0; i < dataHex.length; i += 2) {
        const charCode = parseInt(dataHex.slice(i, i + 2), 16);
        if (charCode > 0) result += String.fromCharCode(charCode);
      }
      return result;
    } catch {
      return '';
    }
  }
}
```

**Step 4: Create utils file**

```typescript
// packages/chains/src/evm/utils.ts

export function formatUnits(value: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const integerPart = value / divisor;
  const remainder = value % divisor;

  if (remainder === 0n) {
    return integerPart.toString();
  }

  const remainderStr = remainder.toString().padStart(decimals, '0');
  const trimmedRemainder = remainderStr.replace(/0+$/, '');

  return `${integerPart}.${trimmedRemainder}`;
}

export function parseUnits(value: string, decimals: number): bigint {
  const [integerPart, fractionalPart = ''] = value.split('.');
  const paddedFraction = fractionalPart.slice(0, decimals).padEnd(decimals, '0');
  return BigInt(integerPart + paddedFraction);
}
```

**Step 5: Run test to verify it passes**

Run: `cd packages/chains && npx vitest run tests/unit/evm/balance.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/chains/src/evm/balance.ts packages/chains/src/evm/utils.ts packages/chains/tests/unit/evm/balance.test.ts
git commit -m "feat(chains): add EVM balance fetching"
```

---

### Task 2.3: EVM Transaction Building

**Files:**
- Create: `packages/chains/src/evm/transaction-builder.ts`
- Create: `packages/chains/tests/unit/evm/transaction-builder.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/chains/tests/unit/evm/transaction-builder.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnsignedEvmTransaction } from '../../src/evm/transaction-builder.js';
import type { EvmChainConfig } from '../../src/evm/config.js';

describe('UnsignedEvmTransaction', () => {
  const mockConfig: EvmChainConfig = {
    chainAlias: 'ethereum',
    chainId: 1,
    rpcUrl: 'https://test-rpc.com',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  };

  const mockTxData = {
    type: 2 as const,
    chainId: 1,
    nonce: 0,
    to: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    value: '1000000000000000000',
    data: '0x',
    gasLimit: '21000',
    maxFeePerGas: '50000000000',
    maxPriorityFeePerGas: '2000000000',
  };

  describe('constructor', () => {
    it('creates transaction with correct properties', () => {
      const tx = new UnsignedEvmTransaction(mockConfig, mockTxData);

      expect(tx.chainAlias).toBe('ethereum');
      expect(tx.raw).toEqual(mockTxData);
      expect(tx.serialized).toBeDefined();
    });
  });

  describe('rebuild', () => {
    it('returns new transaction with updated nonce', () => {
      const tx = new UnsignedEvmTransaction(mockConfig, mockTxData);
      const rebuilt = tx.rebuild({ nonce: 5 });

      expect(rebuilt).not.toBe(tx);
      expect((rebuilt.raw as typeof mockTxData).nonce).toBe(5);
      expect((tx.raw as typeof mockTxData).nonce).toBe(0); // Original unchanged
    });

    it('returns new transaction with updated gas', () => {
      const tx = new UnsignedEvmTransaction(mockConfig, mockTxData);
      const rebuilt = tx.rebuild({
        maxFeePerGas: '100000000000',
        maxPriorityFeePerGas: '5000000000',
      });

      expect((rebuilt.raw as typeof mockTxData).maxFeePerGas).toBe('100000000000');
      expect((rebuilt.raw as typeof mockTxData).maxPriorityFeePerGas).toBe('5000000000');
    });
  });

  describe('getSigningPayload', () => {
    it('returns secp256k1 algorithm', () => {
      const tx = new UnsignedEvmTransaction(mockConfig, mockTxData);
      const payload = tx.getSigningPayload();

      expect(payload.algorithm).toBe('secp256k1');
      expect(payload.chainAlias).toBe('ethereum');
      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.data.length).toBe(1);
    });
  });

  describe('toNormalised', () => {
    it('returns normalised native transfer', () => {
      const tx = new UnsignedEvmTransaction(mockConfig, mockTxData);
      const normalised = tx.toNormalised();

      expect(normalised.chainAlias).toBe('ethereum');
      expect(normalised.to).toBe(mockTxData.to);
      expect(normalised.value).toBe(mockTxData.value);
      expect(normalised.type).toBe('native-transfer');
      expect(normalised.symbol).toBe('ETH');
    });

    it('identifies contract deployment when to is null', () => {
      const deployTx = new UnsignedEvmTransaction(mockConfig, {
        ...mockTxData,
        to: null,
        data: '0x608060405234801561001057600080fd5b50',
      });
      const normalised = deployTx.toNormalised();

      expect(normalised.type).toBe('contract-deployment');
      expect(normalised.to).toBeNull();
      expect(normalised.metadata.isContractDeployment).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/chains && npx vitest run tests/unit/evm/transaction-builder.test.ts`
Expected: FAIL

**Step 3: Implement EVM transaction builder**

```typescript
// packages/chains/src/evm/transaction-builder.ts
import type {
  ChainAlias,
  SigningPayload,
  EvmTransactionOverrides,
  TransactionOverrides,
  TransactionType,
} from '../core/types.js';
import type {
  UnsignedTransaction,
  SignedTransaction,
  NormalisedTransaction,
  RawEvmTransaction,
} from '../core/interfaces.js';
import type { EvmChainConfig } from './config.js';
import { formatUnits } from './utils.js';
import { SignedEvmTransaction } from './signed-transaction.js';

export interface EvmTransactionData {
  type: 0 | 1 | 2;
  chainId: number;
  nonce: number;
  to: string | null;
  value: string;
  data: string;
  gasLimit: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  accessList?: Array<{ address: string; storageKeys: string[] }>;
}

export class UnsignedEvmTransaction implements UnsignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly raw: EvmTransactionData;
  readonly serialized: string;

  constructor(
    private readonly config: EvmChainConfig,
    txData: EvmTransactionData
  ) {
    this.chainAlias = config.chainAlias;
    this.raw = txData;
    this.serialized = this.serialize();
  }

  rebuild(overrides: TransactionOverrides): UnsignedTransaction {
    const evmOverrides = overrides as EvmTransactionOverrides;
    const newData: EvmTransactionData = {
      ...this.raw,
      nonce: evmOverrides.nonce ?? this.raw.nonce,
      gasLimit: evmOverrides.gasLimit ?? this.raw.gasLimit,
    };

    if (this.raw.type === 2) {
      newData.maxFeePerGas = evmOverrides.maxFeePerGas ?? this.raw.maxFeePerGas;
      newData.maxPriorityFeePerGas = evmOverrides.maxPriorityFeePerGas ?? this.raw.maxPriorityFeePerGas;
    }

    return new UnsignedEvmTransaction(this.config, newData);
  }

  getSigningPayload(): SigningPayload {
    const hash = this.getTransactionHash();
    return {
      chainAlias: this.chainAlias,
      data: [hash],
      algorithm: 'secp256k1',
    };
  }

  applySignature(signatures: string[]): SignedTransaction {
    if (signatures.length !== 1) {
      throw new Error('EVM transactions require exactly one signature');
    }
    return new SignedEvmTransaction(this.config, this.raw, signatures[0]);
  }

  toNormalised(): NormalisedTransaction {
    const type = this.classifyTransaction();

    return {
      chainAlias: this.chainAlias,
      to: this.raw.to,
      value: this.raw.value,
      formattedValue: formatUnits(BigInt(this.raw.value), this.config.nativeCurrency.decimals),
      symbol: this.config.nativeCurrency.symbol,
      type,
      data: this.raw.data !== '0x' ? this.raw.data : undefined,
      metadata: {
        nonce: this.raw.nonce,
        isContractDeployment: this.raw.to === null,
      },
    };
  }

  toRaw(): RawEvmTransaction {
    return {
      _chain: 'evm',
      ...this.raw,
    };
  }

  private serialize(): string {
    // Simplified serialization - in production use RLP encoding
    return JSON.stringify(this.raw);
  }

  private getTransactionHash(): string {
    // Simplified hash - in production compute keccak256 of RLP-encoded tx
    const serialized = this.serialize();
    return '0x' + Buffer.from(serialized).toString('hex').slice(0, 64);
  }

  private classifyTransaction(): TransactionType {
    if (this.raw.to === null) return 'contract-deployment';
    if (!this.raw.data || this.raw.data === '0x') return 'native-transfer';

    const selector = this.raw.data.slice(2, 10).toLowerCase();

    // ERC20 transfer/transferFrom
    if (selector === 'a9059cbb' || selector === '23b872dd') return 'token-transfer';
    // ERC721/ERC1155 transfers
    if (selector === '42842e0e' || selector === 'f242432a') return 'nft-transfer';
    // ERC20 approve
    if (selector === '095ea7b3') return 'approval';

    return 'contract-call';
  }
}
```

**Step 4: Create signed transaction class stub**

```typescript
// packages/chains/src/evm/signed-transaction.ts
import type { ChainAlias, BroadcastResult } from '../core/types.js';
import type { SignedTransaction } from '../core/interfaces.js';
import type { EvmChainConfig } from './config.js';
import type { EvmTransactionData } from './transaction-builder.js';

export class SignedEvmTransaction implements SignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly serialized: string;
  readonly hash: string;

  constructor(
    private readonly config: EvmChainConfig,
    private readonly txData: EvmTransactionData,
    private readonly signature: string
  ) {
    this.chainAlias = config.chainAlias;
    this.serialized = this.serialize();
    this.hash = this.computeHash();
  }

  async broadcast(rpcUrl?: string): Promise<BroadcastResult> {
    const url = rpcUrl ?? this.config.rpcUrl;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'eth_sendRawTransaction',
        params: [this.serialized],
      }),
    });

    const json = await response.json();

    if (json.error) {
      return {
        hash: this.hash,
        success: false,
        error: json.error.message,
      };
    }

    return {
      hash: json.result,
      success: true,
    };
  }

  private serialize(): string {
    // Simplified - in production use proper RLP encoding with signature
    return '0x' + JSON.stringify({ ...this.txData, signature: this.signature });
  }

  private computeHash(): string {
    // Simplified - in production compute keccak256 of signed tx
    return '0x' + Buffer.from(this.serialized).toString('hex').slice(0, 64);
  }
}
```

**Step 5: Run test to verify it passes**

Run: `cd packages/chains && npx vitest run tests/unit/evm/transaction-builder.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/chains/src/evm/transaction-builder.ts packages/chains/src/evm/signed-transaction.ts packages/chains/tests/unit/evm/transaction-builder.test.ts
git commit -m "feat(chains): add EVM transaction building and signing"
```

---

### Task 2.4: EVM Provider

**Files:**
- Create: `packages/chains/src/evm/provider.ts`
- Create: `packages/chains/src/evm/index.ts`
- Create: `packages/chains/tests/unit/evm/provider.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/chains/tests/unit/evm/provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvmChainProvider } from '../../src/evm/provider.js';

describe('EvmChainProvider', () => {
  let provider: EvmChainProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    provider = new EvmChainProvider('ethereum');
  });

  it('has correct chainAlias', () => {
    expect(provider.chainAlias).toBe('ethereum');
  });

  it('has correct config', () => {
    expect(provider.config.chainId).toBe(1);
    expect(provider.config.nativeCurrency.symbol).toBe('ETH');
  });

  describe('buildNativeTransfer', () => {
    it('builds EIP-1559 transaction', async () => {
      // Mock nonce
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x5' }),
      });
      // Mock gas estimate
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 2, result: '0x5208' }),
      });
      // Mock fee data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 3,
          result: { baseFeePerGas: '0x2540be400' },
        }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 4, result: '0x77359400' }),
      });

      const tx = await provider.buildNativeTransfer({
        from: '0xSender',
        to: '0xRecipient',
        value: '1000000000000000000',
      });

      expect(tx.chainAlias).toBe('ethereum');
      expect(tx.raw).toBeDefined();
    });
  });

  describe('decode', () => {
    it('decodes to raw format', () => {
      const serialized = JSON.stringify({
        type: 2,
        chainId: 1,
        nonce: 0,
        to: '0xRecipient',
        value: '1000000000000000000',
        data: '0x',
        gasLimit: '21000',
        maxFeePerGas: '50000000000',
        maxPriorityFeePerGas: '2000000000',
      });

      const raw = provider.decode(serialized, 'raw');

      expect(raw._chain).toBe('evm');
      expect(raw.type).toBe(2);
    });

    it('decodes to normalised format', () => {
      const serialized = JSON.stringify({
        type: 2,
        chainId: 1,
        nonce: 0,
        to: '0xRecipient',
        value: '1000000000000000000',
        data: '0x',
        gasLimit: '21000',
        maxFeePerGas: '50000000000',
        maxPriorityFeePerGas: '2000000000',
      });

      const normalised = provider.decode(serialized, 'normalised');

      expect(normalised.chainAlias).toBe('ethereum');
      expect(normalised.type).toBe('native-transfer');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/chains && npx vitest run tests/unit/evm/provider.test.ts`
Expected: FAIL

**Step 3: Implement EVM provider**

```typescript
// packages/chains/src/evm/provider.ts
import type {
  ChainConfig,
  EvmChainAlias,
  NativeBalance,
  TokenBalance,
  DecodeFormat,
  FeeEstimate,
} from '../core/types.js';
import type {
  IChainProvider,
  UnsignedTransaction,
  NativeTransferParams,
  TokenTransferParams,
  ContractReadParams,
  ContractReadResult,
  ContractCallParams,
  ContractDeployParams,
  DeployedContract,
  RawEvmTransaction,
  NormalisedTransaction,
  RawTransaction,
} from '../core/interfaces.js';
import { UnsupportedOperationError } from '../core/errors.js';
import { getEvmChainConfig, type EvmChainConfig } from './config.js';
import { EvmBalanceFetcher } from './balance.js';
import { UnsignedEvmTransaction, type EvmTransactionData } from './transaction-builder.js';
import { formatUnits } from './utils.js';

export class EvmChainProvider implements IChainProvider {
  readonly config: EvmChainConfig;
  readonly chainAlias: EvmChainAlias;
  private readonly balanceFetcher: EvmBalanceFetcher;

  constructor(chainAlias: EvmChainAlias, rpcUrl?: string) {
    this.chainAlias = chainAlias;
    this.config = getEvmChainConfig(chainAlias, rpcUrl);
    this.balanceFetcher = new EvmBalanceFetcher(this.config);
  }

  // IBalanceFetcher
  getNativeBalance(address: string): Promise<NativeBalance> {
    return this.balanceFetcher.getNativeBalance(address);
  }

  getTokenBalance(address: string, contractAddress: string): Promise<TokenBalance> {
    return this.balanceFetcher.getTokenBalance(address, contractAddress);
  }

  // ITransactionBuilder
  async buildNativeTransfer(params: NativeTransferParams): Promise<UnsignedTransaction> {
    const [nonce, gasLimit, feeData] = await Promise.all([
      params.overrides?.nonce ?? this.getTransactionCount(params.from),
      params.overrides?.gasLimit ?? this.estimateGasForTransfer(params),
      this.getFeeData(),
    ]);

    const txData: EvmTransactionData = {
      type: this.config.supportsEip1559 ? 2 : 0,
      chainId: this.config.chainId,
      nonce,
      to: params.to,
      value: params.value,
      data: '0x',
      gasLimit,
      ...(this.config.supportsEip1559
        ? {
            maxFeePerGas: params.overrides?.maxFeePerGas ?? feeData.maxFeePerGas,
            maxPriorityFeePerGas: params.overrides?.maxPriorityFeePerGas ?? feeData.maxPriorityFeePerGas,
          }
        : {
            gasPrice: feeData.gasPrice,
          }),
    };

    return new UnsignedEvmTransaction(this.config, txData);
  }

  async buildTokenTransfer(params: TokenTransferParams): Promise<UnsignedTransaction> {
    // ERC20 transfer(address,uint256)
    const selector = 'a9059cbb';
    const paddedTo = params.to.toLowerCase().replace('0x', '').padStart(64, '0');
    const paddedValue = BigInt(params.value).toString(16).padStart(64, '0');
    const data = '0x' + selector + paddedTo + paddedValue;

    const [nonce, gasLimit, feeData] = await Promise.all([
      params.overrides?.nonce ?? this.getTransactionCount(params.from),
      params.overrides?.gasLimit ?? '65000', // ERC20 transfer gas estimate
      this.getFeeData(),
    ]);

    const txData: EvmTransactionData = {
      type: this.config.supportsEip1559 ? 2 : 0,
      chainId: this.config.chainId,
      nonce,
      to: params.contractAddress,
      value: '0',
      data,
      gasLimit,
      ...(this.config.supportsEip1559
        ? {
            maxFeePerGas: params.overrides?.maxFeePerGas ?? feeData.maxFeePerGas,
            maxPriorityFeePerGas: params.overrides?.maxPriorityFeePerGas ?? feeData.maxPriorityFeePerGas,
          }
        : {
            gasPrice: feeData.gasPrice,
          }),
    };

    return new UnsignedEvmTransaction(this.config, txData);
  }

  decode<F extends DecodeFormat>(
    serialized: string,
    format: F
  ): F extends 'raw' ? RawTransaction : NormalisedTransaction {
    const parsed = JSON.parse(serialized) as EvmTransactionData;
    const tx = new UnsignedEvmTransaction(this.config, parsed);

    if (format === 'raw') {
      return tx.toRaw() as F extends 'raw' ? RawTransaction : NormalisedTransaction;
    }

    return tx.toNormalised() as F extends 'raw' ? RawTransaction : NormalisedTransaction;
  }

  async estimateFee(): Promise<FeeEstimate> {
    const feeData = await this.getFeeData();
    const gasLimit = 21000n; // Standard transfer

    const slow = (BigInt(feeData.maxFeePerGas) * 80n) / 100n;
    const standard = BigInt(feeData.maxFeePerGas);
    const fast = (BigInt(feeData.maxFeePerGas) * 120n) / 100n;

    const { decimals, symbol } = this.config.nativeCurrency;

    return {
      slow: {
        fee: (slow * gasLimit).toString(),
        formattedFee: formatUnits(slow * gasLimit, decimals) + ' ' + symbol,
      },
      standard: {
        fee: (standard * gasLimit).toString(),
        formattedFee: formatUnits(standard * gasLimit, decimals) + ' ' + symbol,
      },
      fast: {
        fee: (fast * gasLimit).toString(),
        formattedFee: formatUnits(fast * gasLimit, decimals) + ' ' + symbol,
      },
    };
  }

  async estimateGas(params: ContractCallParams): Promise<string> {
    const result = await this.rpcCall('eth_estimateGas', [
      {
        from: params.from,
        to: params.contractAddress,
        data: params.data,
        value: params.value ? '0x' + BigInt(params.value).toString(16) : undefined,
      },
    ]);

    return BigInt(result).toString();
  }

  // IContractInteraction
  async contractRead(params: ContractReadParams): Promise<ContractReadResult> {
    const result = await this.rpcCall('eth_call', [
      {
        to: params.contractAddress,
        data: params.data,
        from: params.from,
      },
      'latest',
    ]);

    return { data: result };
  }

  async contractCall(params: ContractCallParams): Promise<UnsignedTransaction> {
    const [nonce, gasLimit, feeData] = await Promise.all([
      params.overrides?.nonce ?? this.getTransactionCount(params.from),
      params.overrides?.gasLimit ?? this.estimateGas(params),
      this.getFeeData(),
    ]);

    const txData: EvmTransactionData = {
      type: this.config.supportsEip1559 ? 2 : 0,
      chainId: this.config.chainId,
      nonce,
      to: params.contractAddress,
      value: params.value ?? '0',
      data: params.data,
      gasLimit,
      ...(this.config.supportsEip1559
        ? {
            maxFeePerGas: params.overrides?.maxFeePerGas ?? feeData.maxFeePerGas,
            maxPriorityFeePerGas: params.overrides?.maxPriorityFeePerGas ?? feeData.maxPriorityFeePerGas,
          }
        : {
            gasPrice: feeData.gasPrice,
          }),
    };

    return new UnsignedEvmTransaction(this.config, txData);
  }

  async contractDeploy(params: ContractDeployParams): Promise<DeployedContract> {
    const [nonce, feeData] = await Promise.all([
      params.overrides?.nonce ?? this.getTransactionCount(params.from),
      this.getFeeData(),
    ]);

    const data = params.constructorArgs
      ? params.bytecode + params.constructorArgs.replace('0x', '')
      : params.bytecode;

    // Estimate gas for deployment
    const gasLimit = params.overrides?.gasLimit ?? await this.rpcCall('eth_estimateGas', [
      { from: params.from, data, value: params.value ? '0x' + BigInt(params.value).toString(16) : '0x0' },
    ]).then((r) => BigInt(r).toString());

    const txData: EvmTransactionData = {
      type: this.config.supportsEip1559 ? 2 : 0,
      chainId: this.config.chainId,
      nonce,
      to: null,
      value: params.value ?? '0',
      data,
      gasLimit,
      ...(this.config.supportsEip1559
        ? {
            maxFeePerGas: params.overrides?.maxFeePerGas ?? feeData.maxFeePerGas,
            maxPriorityFeePerGas: params.overrides?.maxPriorityFeePerGas ?? feeData.maxPriorityFeePerGas,
          }
        : {
            gasPrice: feeData.gasPrice,
          }),
    };

    // Calculate expected contract address: keccak256(rlp([sender, nonce]))[12:]
    // Simplified - in production use proper address derivation
    const expectedAddress = '0x' + 'c'.repeat(40);

    return {
      transaction: new UnsignedEvmTransaction(this.config, txData),
      expectedAddress,
    };
  }

  // Helper methods
  private async getTransactionCount(address: string): Promise<number> {
    const result = await this.rpcCall('eth_getTransactionCount', [address, 'latest']);
    return parseInt(result, 16);
  }

  private async estimateGasForTransfer(params: NativeTransferParams): Promise<string> {
    const result = await this.rpcCall('eth_estimateGas', [
      {
        from: params.from,
        to: params.to,
        value: '0x' + BigInt(params.value).toString(16),
      },
    ]);
    return BigInt(result).toString();
  }

  private async getFeeData(): Promise<{
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    gasPrice: string;
  }> {
    if (this.config.supportsEip1559) {
      const [block, maxPriorityFee] = await Promise.all([
        this.rpcCall('eth_getBlockByNumber', ['latest', false]),
        this.rpcCall('eth_maxPriorityFeePerGas', []),
      ]);

      const baseFee = BigInt(block.baseFeePerGas);
      const priorityFee = BigInt(maxPriorityFee);
      const maxFee = baseFee * 2n + priorityFee;

      return {
        maxFeePerGas: maxFee.toString(),
        maxPriorityFeePerGas: priorityFee.toString(),
        gasPrice: maxFee.toString(),
      };
    }

    const gasPrice = await this.rpcCall('eth_gasPrice', []);
    return {
      maxFeePerGas: BigInt(gasPrice).toString(),
      maxPriorityFeePerGas: '0',
      gasPrice: BigInt(gasPrice).toString(),
    };
  }

  private async rpcCall(method: string, params: unknown[]): Promise<any> {
    const response = await fetch(this.config.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });

    const json = await response.json();

    if (json.error) {
      throw new Error(json.error.message);
    }

    return json.result;
  }
}
```

**Step 4: Create EVM index**

```typescript
// packages/chains/src/evm/index.ts
export { EvmChainProvider } from './provider.js';
export { EVM_CHAIN_CONFIGS, getEvmChainConfig, type EvmChainConfig } from './config.js';
export { EvmBalanceFetcher } from './balance.js';
export { UnsignedEvmTransaction } from './transaction-builder.js';
export { SignedEvmTransaction } from './signed-transaction.js';
export { formatUnits, parseUnits } from './utils.js';
```

**Step 5: Run test to verify it passes**

Run: `cd packages/chains && npx vitest run tests/unit/evm/provider.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/chains/src/evm/provider.ts packages/chains/src/evm/index.ts packages/chains/tests/unit/evm/provider.test.ts
git commit -m "feat(chains): add EVM chain provider with full interface implementation"
```

---

## Phase 3-7: Other Ecosystem Implementations

> **Note:** Phases 3-7 follow the same TDD pattern as Phase 2 for each ecosystem:
> - SVM (Solana) - Phase 3
> - UTXO (Bitcoin) - Phase 4
> - TVM (TRON) - Phase 5
> - XRP - Phase 6
> - Substrate (Bittensor) - Phase 7

Each phase includes:
1. Chain config (config.ts)
2. Balance fetching (balance.ts)
3. Transaction builder (transaction-builder.ts)
4. Signed transaction (signed-transaction.ts)
5. Provider integration (provider.ts)
6. Module exports (index.ts)

Due to length, these phases follow the exact same structure as Phase 2 but with ecosystem-specific implementations. Proceed with implementing each ecosystem after completing the previous one.

---

## Phase 8: Public API and Integration

### Task 8.1: Public API Functions

**Files:**
- Create: `packages/chains/src/api.ts`
- Create: `packages/chains/tests/unit/api.test.ts`
- Modify: `packages/chains/src/index.ts`

**Step 1: Write the failing test**

```typescript
// packages/chains/tests/unit/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getChainProvider,
  getNativeBalance,
  buildNativeTransfer,
  decodeTransaction,
  parseTransaction,
} from '../../src/api.js';

describe('Public API', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe('getChainProvider', () => {
    it('returns EVM provider for ethereum', () => {
      const provider = getChainProvider('ethereum');
      expect(provider.chainAlias).toBe('ethereum');
    });

    it('throws for unsupported chain', () => {
      expect(() => getChainProvider('fake-chain' as any)).toThrow('Unsupported chain');
    });
  });

  describe('getNativeBalance', () => {
    it('delegates to chain provider', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: '0xde0b6b3a7640000',
        }),
      });

      const balance = await getNativeBalance('ethereum', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e');

      expect(balance.balance).toBe('1000000000000000000');
      expect(balance.symbol).toBe('ETH');
    });
  });

  describe('decodeTransaction', () => {
    it('decodes EVM transaction to normalised format', () => {
      const serialized = JSON.stringify({
        type: 2,
        chainId: 1,
        nonce: 0,
        to: '0xRecipient',
        value: '1000000000000000000',
        data: '0x',
        gasLimit: '21000',
        maxFeePerGas: '50000000000',
        maxPriorityFeePerGas: '2000000000',
      });

      const result = decodeTransaction('ethereum', serialized, 'normalised');

      expect(result.chainAlias).toBe('ethereum');
      expect(result.type).toBe('native-transfer');
    });
  });

  describe('parseTransaction', () => {
    it('reconstructs UnsignedTransaction from serialized', () => {
      const serialized = JSON.stringify({
        type: 2,
        chainId: 1,
        nonce: 0,
        to: '0xRecipient',
        value: '1000000000000000000',
        data: '0x',
        gasLimit: '21000',
        maxFeePerGas: '50000000000',
        maxPriorityFeePerGas: '2000000000',
      });

      const tx = parseTransaction('ethereum', serialized);

      expect(tx.chainAlias).toBe('ethereum');
      expect(typeof tx.rebuild).toBe('function');
      expect(typeof tx.getSigningPayload).toBe('function');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/chains && npx vitest run tests/unit/api.test.ts`
Expected: FAIL

**Step 3: Implement public API**

```typescript
// packages/chains/src/api.ts
import type {
  ChainAlias,
  NativeBalance,
  TokenBalance,
  DecodeFormat,
  FeeEstimate,
  BroadcastResult,
} from './core/types.js';
import type {
  IChainProvider,
  UnsignedTransaction,
  NativeTransferParams,
  TokenTransferParams,
  ContractReadParams,
  ContractReadResult,
  ContractCallParams,
  ContractDeployParams,
  DeployedContract,
  NormalisedTransaction,
  RawTransaction,
} from './core/interfaces.js';
import { UnsupportedChainError } from './core/errors.js';
import { getEcosystem, isValidChainAlias } from './core/registry.js';
import { providerCache } from './core/provider-cache.js';
import { EvmChainProvider } from './evm/provider.js';

// Global configuration
let globalRpcOverrides: Partial<Record<ChainAlias, string>> = {};

export interface ChainProviderConfig {
  rpcOverrides?: Partial<Record<ChainAlias, string>>;
}

export function configure(config: ChainProviderConfig): void {
  if (config.rpcOverrides) {
    globalRpcOverrides = { ...globalRpcOverrides, ...config.rpcOverrides };
  }
}

function createProvider(chainAlias: ChainAlias, rpcUrl?: string): IChainProvider {
  const ecosystem = getEcosystem(chainAlias);
  const effectiveRpcUrl = rpcUrl ?? globalRpcOverrides[chainAlias];

  switch (ecosystem) {
    case 'evm':
      return new EvmChainProvider(chainAlias as any, effectiveRpcUrl);
    // TODO: Add other ecosystems as implemented
    // case 'svm':
    //   return new SvmChainProvider(chainAlias as any, effectiveRpcUrl);
    // case 'utxo':
    //   return new UtxoChainProvider(chainAlias as any, effectiveRpcUrl);
    // case 'tvm':
    //   return new TvmChainProvider(chainAlias as any, effectiveRpcUrl);
    // case 'xrp':
    //   return new XrpChainProvider(chainAlias as any, effectiveRpcUrl);
    // case 'substrate':
    //   return new SubstrateChainProvider(chainAlias as any, effectiveRpcUrl);
    default:
      throw new UnsupportedChainError(chainAlias);
  }
}

export function getChainProvider(chainAlias: ChainAlias, rpcUrl?: string): IChainProvider {
  if (!isValidChainAlias(chainAlias)) {
    throw new UnsupportedChainError(chainAlias);
  }

  const effectiveRpcUrl = rpcUrl ?? globalRpcOverrides[chainAlias] ?? '';

  // Try cache first
  const cached = providerCache.get(chainAlias, effectiveRpcUrl);
  if (cached) {
    return cached;
  }

  // Create new provider and cache it
  const provider = createProvider(chainAlias, rpcUrl);
  if (effectiveRpcUrl) {
    providerCache.set(chainAlias, effectiveRpcUrl, provider);
  }

  return provider;
}

// Balance convenience functions
export async function getNativeBalance(
  chainAlias: ChainAlias,
  address: string,
  rpcUrl?: string
): Promise<NativeBalance> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.getNativeBalance(address);
}

export async function getTokenBalance(
  chainAlias: ChainAlias,
  address: string,
  contractAddress: string,
  rpcUrl?: string
): Promise<TokenBalance> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.getTokenBalance(address, contractAddress);
}

// Transaction convenience functions
export async function buildNativeTransfer(
  chainAlias: ChainAlias,
  params: NativeTransferParams,
  rpcUrl?: string
): Promise<UnsignedTransaction> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.buildNativeTransfer(params);
}

export async function buildTokenTransfer(
  chainAlias: ChainAlias,
  params: TokenTransferParams,
  rpcUrl?: string
): Promise<UnsignedTransaction> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.buildTokenTransfer(params);
}

export function decodeTransaction<F extends DecodeFormat>(
  chainAlias: ChainAlias,
  serialized: string,
  format: F
): F extends 'raw' ? RawTransaction : NormalisedTransaction {
  const provider = getChainProvider(chainAlias);
  return provider.decode(serialized, format);
}

export function parseTransaction(
  chainAlias: ChainAlias,
  serialized: string
): UnsignedTransaction {
  const provider = getChainProvider(chainAlias);
  // Decode to raw, then reconstruct
  const raw = provider.decode(serialized, 'raw');

  // Re-create UnsignedTransaction from raw data
  const ecosystem = getEcosystem(chainAlias);

  switch (ecosystem) {
    case 'evm': {
      const { EvmChainProvider } = require('./evm/provider.js');
      const { UnsignedEvmTransaction } = require('./evm/transaction-builder.js');
      const { getEvmChainConfig } = require('./evm/config.js');

      const config = getEvmChainConfig(chainAlias as any);
      const { _chain, ...txData } = raw as any;
      return new UnsignedEvmTransaction(config, txData);
    }
    // TODO: Add other ecosystems
    default:
      throw new UnsupportedChainError(chainAlias);
  }
}

// Fee estimation
export async function estimateFee(
  chainAlias: ChainAlias,
  rpcUrl?: string
): Promise<FeeEstimate> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.estimateFee();
}

export async function estimateGas(
  chainAlias: ChainAlias,
  params: ContractCallParams,
  rpcUrl?: string
): Promise<string> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.estimateGas(params);
}

// Account info
export async function getTransactionCount(
  chainAlias: ChainAlias,
  address: string,
  rpcUrl?: string
): Promise<number> {
  const provider = getChainProvider(chainAlias, rpcUrl) as any;
  if (typeof provider.getTransactionCount === 'function') {
    return provider.getTransactionCount(address);
  }
  throw new Error(`getTransactionCount not supported for ${chainAlias}`);
}

// Contract convenience functions
export async function contractRead(
  chainAlias: ChainAlias,
  params: ContractReadParams,
  rpcUrl?: string
): Promise<ContractReadResult> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.contractRead(params);
}

export async function contractCall(
  chainAlias: ChainAlias,
  params: ContractCallParams,
  rpcUrl?: string
): Promise<UnsignedTransaction> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.contractCall(params);
}

export async function contractDeploy(
  chainAlias: ChainAlias,
  params: ContractDeployParams,
  rpcUrl?: string
): Promise<DeployedContract> {
  const provider = getChainProvider(chainAlias, rpcUrl);
  return provider.contractDeploy(params);
}

// Type guards
export function isEvmTransaction(tx: RawTransaction): tx is import('./core/interfaces.js').RawEvmTransaction {
  return (tx as any)._chain === 'evm';
}

export function isSolanaTransaction(tx: RawTransaction): tx is import('./core/interfaces.js').RawSolanaTransaction {
  return (tx as any)._chain === 'svm';
}

export function isUtxoTransaction(tx: RawTransaction): tx is import('./core/interfaces.js').RawUtxoTransaction {
  return (tx as any)._chain === 'utxo';
}

export function isTronTransaction(tx: RawTransaction): tx is import('./core/interfaces.js').RawTronTransaction {
  return (tx as any)._chain === 'tvm';
}

export function isXrpTransaction(tx: RawTransaction): tx is import('./core/interfaces.js').RawXrpTransaction {
  return (tx as any)._chain === 'xrp';
}
```

**Step 4: Update main index**

```typescript
// packages/chains/src/index.ts
// Core exports
export * from './core/index.js';

// EVM exports
export * from './evm/index.js';

// Public API
export {
  configure,
  getChainProvider,
  getNativeBalance,
  getTokenBalance,
  buildNativeTransfer,
  buildTokenTransfer,
  decodeTransaction,
  parseTransaction,
  estimateFee,
  estimateGas,
  getTransactionCount,
  contractRead,
  contractCall,
  contractDeploy,
  isEvmTransaction,
  isSolanaTransaction,
  isUtxoTransaction,
  isTronTransaction,
  isXrpTransaction,
  type ChainProviderConfig,
} from './api.js';

export const VERSION = '0.0.1';
```

**Step 5: Run test to verify it passes**

Run: `cd packages/chains && npx vitest run tests/unit/api.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/chains/src/api.ts packages/chains/src/index.ts packages/chains/tests/unit/api.test.ts
git commit -m "feat(chains): add public API with convenience functions"
```

---

### Task 8.2: Run Full Test Suite

**Step 1: Run all tests**

Run: `cd packages/chains && npx vitest run`
Expected: All tests PASS

**Step 2: Verify TypeScript compilation**

Run: `cd packages/chains && npx tsc`
Expected: No errors, dist/ folder created

**Step 3: Commit final state**

```bash
git add packages/chains/dist
git commit -m "chore(chains): verify full package compilation and tests"
```

---

## Implementation Notes

1. **This plan implements Phase 1 (Core) and Phase 2 (EVM) in full detail.** Phases 3-7 follow the same TDD pattern for each ecosystem.

2. **Each ecosystem implementation requires:**
   - Studying the chain's RPC API documentation
   - Implementing ecosystem-specific transaction serialization
   - Proper signing payload generation for the chain's signature scheme
   - Broadcast error mapping to BroadcastErrorCode

3. **Testing strategy:**
   - Mock `fetch` for RPC calls
   - Use fixtures for transaction data
   - Test both success and error paths
   - Verify type guards work correctly

4. **After completing all phases:**
   - Update the main application to use the new package
   - Remove dependency on `@iofinnet/io-core-dapp-utils-chains-sdk`
   - Update build-transaction handlers to use new package
