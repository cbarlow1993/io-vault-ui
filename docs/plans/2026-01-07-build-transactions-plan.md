# Build Transactions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate legacy Lambda build transaction endpoints to Fastify with router pattern dispatching to ecosystem-specific builders.

**Architecture:** Routes receive requests, validate via Zod schemas, and dispatch to a router that selects the correct ecosystem builder based on `ecosystem:chainAlias` key. WalletFactory creates wallet instances from vault xpub data. Each ecosystem builder calls the chain SDK to construct unsigned transactions.

**Tech Stack:** Fastify, Zod, @iofinnet/io-core-dapp-utils-chains-sdk, Vitest

**Reference:** See `docs/plans/2026-01-07-build-transactions-design.md` for full design.

**Path Convention:** All routes use `/chain/:chainAlias` pattern (not `/chainAlias/:chainAlias`).

---

## Task 0: Standardize Existing Route Paths to `/chain/:chainAlias`

**Files:**
- Modify: `src/routes/addresses/index.ts`
- Modify: `src/routes/balances/index.ts`
- Modify: `src/routes/transactions/index.ts`
- Modify: `src/routes/reconciliation/index.ts`
- Modify: `src/routes/addresses/schemas.ts`
- Modify: `src/routes/balances/schemas.ts`
- Modify: `src/routes/transactions/schemas.ts`
- Modify: `src/routes/reconciliation/schemas.ts`
- Modify: `tests/integration/transactions/build-transaction.test.ts`
- Modify: Other integration tests as needed

**Step 1: Update route paths from `/chainAlias/:chainAlias` to `/chain/:chainAlias`**

In each route file, replace all occurrences of `/chainAlias/:chainAlias` with `/chain/:chainAlias`.

Example change in `src/routes/addresses/index.ts`:
```typescript
// Before:
'/ecosystem/:ecosystem/chainAlias/:chainAlias'

// After:
'/ecosystem/:ecosystem/chain/:chainAlias'
```

**Step 2: Run grep to find all occurrences**

Run: `grep -r "chainAlias/:chainAlias" src/routes/`

**Step 3: Update each file systematically**

**Step 4: Update integration test fixtures**

Update `tests/integration/utils/testFixtures.ts` or similar files to use new path pattern.

**Step 5: Run tests to verify**

Run: `npm run test:integration`
Expected: PASS

**Step 6: Commit**

```bash
git add src/routes/ tests/
git commit -m "refactor: standardize route paths to /chain/:chainAlias pattern"
```

---

## Task 1: Create Shared Types and Interfaces

**Files:**
- Create: `src/services/build-transaction/types.ts`

**Step 1: Create the types file with shared interfaces**

```typescript
import type { Chain, ChainAlias, EcoSystem, IWalletLike } from '@iofinnet/io-core-dapp-utils-chains-sdk';

/**
 * Result from building a transaction
 */
export interface BuildTransactionResult {
  marshalledHex: string;
  details: Array<{ name: string; type: string; value: string }>;
}

/**
 * Result from WalletFactory
 */
export interface WalletFactoryResult<T extends IWalletLike = IWalletLike> {
  wallet: T;
  chain: Chain;
}

/**
 * Common parameters for all transaction builders
 */
export interface BaseTransactionParams {
  amount: string;
  to: string;
  derivationPath?: string;
}

/**
 * Parameters passed to native transaction builders (after wallet resolution)
 */
export interface NativeBuildParams<T extends IWalletLike = IWalletLike> extends BaseTransactionParams {
  wallet: T;
  chain: Chain;
}

/**
 * Parameters passed to token transaction builders (after wallet resolution)
 */
export interface TokenBuildParams<T extends IWalletLike = IWalletLike> extends NativeBuildParams<T> {
  tokenAddress: string;
}

/**
 * Known error structure for error mapping
 */
export interface KnownError {
  status: number;
  message: string;
  path?: string[];
}

/**
 * Builder key format
 */
export type BuilderKey = `${EcoSystem}:${ChainAlias}`;
```

**Step 2: Commit**

```bash
git add src/services/build-transaction/types.ts
git commit -m "feat(build-tx): add shared types and interfaces"
```

---

## Task 2: Create WalletFactory Service

**Files:**
- Create: `src/services/build-transaction/wallet-factory.ts`
- Test: `tests/unit/services/build-transaction/wallet-factory.test.ts`

**Step 1: Write the failing test**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Chain, Wallet } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { WalletFactory } from '@/src/services/build-transaction/wallet-factory.js';
import type { VaultService } from '@/src/services/vaults/vault-service.js';

vi.mock('@iofinnet/io-core-dapp-utils-chains-sdk', () => ({
  Chain: {
    fromAlias: vi.fn(),
  },
  Wallet: {
    fromXpub: vi.fn(),
  },
}));

describe('WalletFactory', () => {
  let walletFactory: WalletFactory;
  let mockVaultService: VaultService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVaultService = {
      getVaultXpub: vi.fn(),
    } as unknown as VaultService;
    walletFactory = new WalletFactory(mockVaultService);
  });

  describe('createWallet', () => {
    it('should create wallet from vault xpub', async () => {
      const mockXpub = 'xpub661MyMwAqRbctest';
      const mockWallet = { address: '0x123' };
      const mockChain = { Config: { ecosystem: 'evm' } };

      vi.mocked(mockVaultService.getVaultXpub).mockResolvedValue(mockXpub);
      vi.mocked(Chain.fromAlias).mockResolvedValue(mockChain as any);
      vi.mocked(Wallet.fromXpub).mockResolvedValue(mockWallet as any);

      const result = await walletFactory.createWallet('vault-123', 'ethereum' as any);

      expect(mockVaultService.getVaultXpub).toHaveBeenCalledWith('vault-123', 'ethereum');
      expect(Chain.fromAlias).toHaveBeenCalledWith('ethereum');
      expect(Wallet.fromXpub).toHaveBeenCalledWith(mockXpub, mockChain, undefined);
      expect(result).toEqual({ wallet: mockWallet, chain: mockChain });
    });

    it('should pass derivation path to Wallet.fromXpub', async () => {
      const mockXpub = 'xpub661MyMwAqRbctest';
      const mockWallet = { address: '0x123' };
      const mockChain = { Config: { ecosystem: 'evm' } };
      const derivationPath = 'm/44/60/0/0/1';

      vi.mocked(mockVaultService.getVaultXpub).mockResolvedValue(mockXpub);
      vi.mocked(Chain.fromAlias).mockResolvedValue(mockChain as any);
      vi.mocked(Wallet.fromXpub).mockResolvedValue(mockWallet as any);

      await walletFactory.createWallet('vault-123', 'ethereum' as any, derivationPath);

      expect(Wallet.fromXpub).toHaveBeenCalledWith(mockXpub, mockChain, derivationPath);
    });

    it('should throw NotFoundError when vault xpub not found', async () => {
      vi.mocked(mockVaultService.getVaultXpub).mockResolvedValue(null);

      await expect(walletFactory.createWallet('vault-123', 'ethereum' as any))
        .rejects.toThrow('Vault xpub not found');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/services/build-transaction/wallet-factory.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
import { NotFoundError } from '@iofinnet/errors-sdk';
import { Chain, type ChainAlias, type IWalletLike, Wallet } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { VaultService } from '@/src/services/vaults/vault-service.js';
import type { WalletFactoryResult } from './types.js';

export class WalletFactory {
  constructor(private vaultService: VaultService) {}

  async createWallet<T extends IWalletLike>(
    vaultId: string,
    chainAlias: ChainAlias,
    derivationPath?: string
  ): Promise<WalletFactoryResult<T>> {
    const xpub = await this.vaultService.getVaultXpub(vaultId, chainAlias);

    if (!xpub) {
      throw new NotFoundError('Vault xpub not found');
    }

    const chain = await Chain.fromAlias(chainAlias);
    const wallet = await Wallet.fromXpub(xpub, chain, derivationPath);

    return { wallet: wallet as T, chain };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/services/build-transaction/wallet-factory.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/build-transaction/wallet-factory.ts tests/unit/services/build-transaction/wallet-factory.test.ts
git commit -m "feat(build-tx): add WalletFactory service"
```

---

## Task 3: Create Error Utilities

**Files:**
- Create: `src/services/build-transaction/error-utils.ts`

**Step 1: Create error utility (adapted from legacy)**

```typescript
import { BadRequestError, InternalServerError } from '@iofinnet/errors-sdk';
import type { KnownError } from './types.js';

/**
 * Maps SDK error messages to HTTP errors
 * Throws the appropriate HTTP error if a match is found
 */
export function buildTransactionErrorToHttpError(
  errorMessage: string,
  knownErrors: Map<string, KnownError>
): never {
  const normalizedMessage = errorMessage.toLowerCase();

  for (const [pattern, error] of knownErrors) {
    if (normalizedMessage.includes(pattern.toLowerCase())) {
      if (error.status >= 500) {
        throw new InternalServerError(error.message);
      }
      throw new BadRequestError(error.message);
    }
  }

  // Default to internal server error for unknown errors
  throw new InternalServerError(`Transaction build failed: ${errorMessage}`);
}
```

**Step 2: Commit**

```bash
git add src/services/build-transaction/error-utils.ts
git commit -m "feat(build-tx): add error mapping utilities"
```

---

## Task 4: Create EVM Builder

**Files:**
- Create: `src/services/build-transaction/builders/evm.ts`
- Test: `tests/unit/services/build-transaction/builders/evm.test.ts`

**Step 1: Write the failing test**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EvmTransactionBuilder, EvmWallet, Chain } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { buildEvmNativeTransaction, buildEvmTokenTransaction } from '@/src/services/build-transaction/builders/evm.js';

describe('EVM Builder', () => {
  let mockWallet: EvmWallet;
  let mockChain: Chain;
  let mockTransaction: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTransaction = {
      marshalHex: vi.fn().mockReturnValue('0xabcd1234'),
      toEIP712Details: vi.fn().mockResolvedValue([
        { name: 'To', type: 'address', value: '0xrecipient' },
        { name: 'Value', type: 'uint256', value: '1000000000000000000' },
      ]),
    };

    mockWallet = {
      address: '0xsender',
    } as unknown as EvmWallet;

    mockChain = {
      TransactionBuilder: {
        buildNativeTransaction: vi.fn().mockResolvedValue(mockTransaction),
        buildTokenTransaction: vi.fn().mockResolvedValue(mockTransaction),
      } as unknown as EvmTransactionBuilder,
    } as unknown as Chain;
  });

  describe('buildEvmNativeTransaction', () => {
    it('should build native transaction and return marshalled hex', async () => {
      const result = await buildEvmNativeTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '1',
        to: '0xrecipient',
      });

      expect(mockChain.TransactionBuilder.buildNativeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '1',
          from: mockWallet,
          to: '0xrecipient',
        })
      );
      expect(result.marshalledHex).toBe('0xabcd1234');
      expect(result.details).toHaveLength(2);
    });

    it('should convert gasPrice from GWEI to WEI', async () => {
      await buildEvmNativeTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '1',
        to: '0xrecipient',
        gasPrice: '0.5',
      });

      expect(mockChain.TransactionBuilder.buildNativeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          gasPrice: '500000000', // 0.5 GWEI = 500000000 WEI
        })
      );
    });
  });

  describe('buildEvmTokenTransaction', () => {
    it('should build token transaction with tokenAddress', async () => {
      const result = await buildEvmTokenTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '100',
        to: '0xrecipient',
        tokenAddress: '0xtoken',
      });

      expect(mockChain.TransactionBuilder.buildTokenTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '100',
          from: mockWallet,
          to: '0xrecipient',
          tokenAddress: '0xtoken',
        })
      );
      expect(result.marshalledHex).toBe('0xabcd1234');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/services/build-transaction/builders/evm.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write implementation (adapted from legacy evm-handler.ts)**

```typescript
import { InternalServerError } from '@iofinnet/errors-sdk';
import type { EvmTransaction, EvmTransactionBuilder, EvmWallet, Chain } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { BigNumber } from 'bignumber.js';
import { buildTransactionErrorToHttpError } from '../error-utils.js';
import type { BuildTransactionResult, KnownError } from '../types.js';
import { logger } from '@/utils/powertools.js';
import { tryCatch } from '@/utils/try-catch.js';

export interface EvmNativeParams {
  wallet: EvmWallet;
  chain: Chain;
  amount: string;
  to: string;
  derivationPath?: string;
  gasPrice?: string;
  gasLimit?: string;
  data?: string;
  nonce?: number;
  type?: 'legacy' | 'eip1559';
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

export interface EvmTokenParams extends EvmNativeParams {
  tokenAddress: string;
}

const knownErrors = new Map<string, KnownError>([
  ['invalid transaction parameters: from address is invalid', { status: 400, message: 'Invalid sender address', path: ['vaultId'] }],
  ['invalid transaction parameters: to address is invalid', { status: 400, message: 'Invalid recipient address', path: ['to'] }],
  ['insufficient balance', { status: 400, message: 'Insufficient balance', path: ['amount'] }],
  ['erc20: transfer amount exceeds balance', { status: 400, message: 'Token transfer amount exceeds balance', path: ['amount'] }],
  ['failed to estimate gas', { status: 500, message: 'Failed to estimate gas' }],
]);

function convertGasPriceToWei(gasPriceGwei?: string): string | undefined {
  if (!gasPriceGwei || gasPriceGwei.trim() === '') {
    return undefined;
  }
  return new BigNumber(gasPriceGwei).multipliedBy(1e9).toString();
}

export async function buildEvmNativeTransaction(params: EvmNativeParams): Promise<BuildTransactionResult> {
  const { wallet, chain, amount, to, gasPrice, gasLimit, data, nonce, type, maxFeePerGas, maxPriorityFeePerGas } = params;

  const gasPriceWei = convertGasPriceToWei(gasPrice);

  const { data: tx, error: txError } = await tryCatch(
    (chain.TransactionBuilder as EvmTransactionBuilder).buildNativeTransaction({
      amount,
      from: wallet,
      to: to as `0x${string}`,
      gasPrice: gasPriceWei,
      gasLimit: gasLimit ?? undefined,
      data: data as `0x${string}` | undefined,
      nonce: nonce ?? undefined,
      type: type ?? undefined,
      maxFeePerGas: maxFeePerGas ?? undefined,
      maxPriorityFeePerGas: maxPriorityFeePerGas ?? undefined,
    })
  );

  if (txError) {
    logger.error('Error building EVM native transaction', { error: txError });
    buildTransactionErrorToHttpError(txError.message || '', knownErrors);
  }

  if (!tx) {
    throw new InternalServerError('Failed to build transaction');
  }

  return marshalTransaction(tx);
}

export async function buildEvmTokenTransaction(params: EvmTokenParams): Promise<BuildTransactionResult> {
  const { wallet, chain, amount, to, tokenAddress, gasPrice, gasLimit, data, nonce, type, maxFeePerGas, maxPriorityFeePerGas } = params;

  const gasPriceWei = convertGasPriceToWei(gasPrice);

  const { data: tx, error: txError } = await tryCatch(
    (chain.TransactionBuilder as EvmTransactionBuilder).buildTokenTransaction({
      amount,
      from: wallet,
      to: to as `0x${string}`,
      tokenAddress,
      gasPrice: gasPriceWei,
      gasLimit: gasLimit ?? undefined,
      data: data as `0x${string}` | undefined,
      nonce: nonce ?? undefined,
      type: type ?? undefined,
      maxFeePerGas: maxFeePerGas ?? undefined,
      maxPriorityFeePerGas: maxPriorityFeePerGas ?? undefined,
    })
  );

  if (txError) {
    logger.error('Error building EVM token transaction', { error: txError });
    buildTransactionErrorToHttpError(txError.message || '', knownErrors);
  }

  if (!tx) {
    throw new InternalServerError('Failed to build transaction');
  }

  return marshalTransaction(tx);
}

async function marshalTransaction(tx: EvmTransaction): Promise<BuildTransactionResult> {
  const { data: marshalledHex, error: marshalError } = await tryCatch(
    Promise.resolve(tx.marshalHex())
  );

  if (marshalError) {
    logger.error('Error marshalling EVM transaction', { error: marshalError });
    throw new InternalServerError('Error marshalling transaction');
  }

  const details = await tx.toEIP712Details();

  return { marshalledHex, details };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/services/build-transaction/builders/evm.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/build-transaction/builders/evm.ts tests/unit/services/build-transaction/builders/evm.test.ts
git commit -m "feat(build-tx): add EVM transaction builder"
```

---

## Task 5: Create SVM Builder

**Files:**
- Create: `src/services/build-transaction/builders/svm.ts`
- Test: `tests/unit/services/build-transaction/builders/svm.test.ts`

**Step 1: Write the failing test**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SolanaTransactionBuilder, SolanaWallet, Chain } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { buildSvmNativeTransaction, buildSvmTokenTransaction } from '@/src/services/build-transaction/builders/svm.js';

describe('SVM Builder', () => {
  let mockWallet: SolanaWallet;
  let mockChain: Chain;
  let mockTransaction: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTransaction = {
      marshalHex: vi.fn().mockReturnValue('base64encodedtx'),
      toEIP712Details: vi.fn().mockResolvedValue([
        { name: 'To', type: 'address', value: 'recipientPubkey' },
        { name: 'Amount', type: 'lamports', value: '1000000000' },
      ]),
    };

    mockWallet = {
      address: 'senderPubkey',
    } as unknown as SolanaWallet;

    mockChain = {
      TransactionBuilder: {
        buildNativeTransaction: vi.fn().mockResolvedValue(mockTransaction),
        buildTokenTransaction: vi.fn().mockResolvedValue(mockTransaction),
      } as unknown as SolanaTransactionBuilder,
    } as unknown as Chain;
  });

  describe('buildSvmNativeTransaction', () => {
    it('should build native SOL transaction', async () => {
      const result = await buildSvmNativeTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '1',
        to: 'recipientPubkey',
      });

      expect(mockChain.TransactionBuilder.buildNativeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '1',
          from: mockWallet,
          to: 'recipientPubkey',
        })
      );
      expect(result.marshalledHex).toBe('base64encodedtx');
    });

    it('should include nonceAccount when provided', async () => {
      await buildSvmNativeTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '1',
        to: 'recipientPubkey',
        nonceAccount: 'nonceAccountPubkey',
      });

      expect(mockChain.TransactionBuilder.buildNativeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          nonceAccount: 'nonceAccountPubkey',
        })
      );
    });
  });

  describe('buildSvmTokenTransaction', () => {
    it('should build SPL token transaction', async () => {
      const result = await buildSvmTokenTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '100',
        to: 'recipientPubkey',
        tokenAddress: 'mintAddress',
      });

      expect(mockChain.TransactionBuilder.buildTokenTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '100',
          tokenAddress: 'mintAddress',
        })
      );
      expect(result.marshalledHex).toBe('base64encodedtx');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/services/build-transaction/builders/svm.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
import { InternalServerError } from '@iofinnet/errors-sdk';
import type { Chain, SolanaTransaction, SolanaTransactionBuilder, SolanaWallet } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { buildTransactionErrorToHttpError } from '../error-utils.js';
import type { BuildTransactionResult, KnownError } from '../types.js';
import { logger } from '@/utils/powertools.js';
import { tryCatch } from '@/utils/try-catch.js';

export interface SvmNativeParams {
  wallet: SolanaWallet;
  chain: Chain;
  amount: string;
  to: string;
  derivationPath?: string;
  nonceAccount?: string;
}

export interface SvmTokenParams extends SvmNativeParams {
  tokenAddress: string;
}

const knownErrors = new Map<string, KnownError>([
  ['invalid payer address', { status: 400, message: 'Invalid payer address', path: ['vaultId'] }],
  ['invalid recipient address', { status: 400, message: 'Invalid recipient address', path: ['to'] }],
  ['insufficient balance', { status: 400, message: 'Insufficient balance for transaction', path: ['amount'] }],
  ['insufficient lamports', { status: 400, message: 'Insufficient SOL balance', path: ['amount'] }],
]);

export async function buildSvmNativeTransaction(params: SvmNativeParams): Promise<BuildTransactionResult> {
  const { wallet, chain, amount, to, nonceAccount } = params;

  const { data: tx, error: txError } = await tryCatch(
    (chain.TransactionBuilder as SolanaTransactionBuilder).buildNativeTransaction({
      amount,
      from: wallet,
      to,
      nonceAccount: nonceAccount ?? undefined,
    })
  );

  if (txError) {
    logger.error('Error building SVM native transaction', { error: txError });
    buildTransactionErrorToHttpError(txError.message || '', knownErrors);
  }

  if (!tx) {
    throw new InternalServerError('Failed to build transaction');
  }

  return marshalTransaction(tx);
}

export async function buildSvmTokenTransaction(params: SvmTokenParams): Promise<BuildTransactionResult> {
  const { wallet, chain, amount, to, tokenAddress, nonceAccount } = params;

  const { data: tx, error: txError } = await tryCatch(
    (chain.TransactionBuilder as SolanaTransactionBuilder).buildTokenTransaction({
      amount,
      from: wallet,
      to,
      tokenAddress,
      nonceAccount: nonceAccount ?? undefined,
    })
  );

  if (txError) {
    logger.error('Error building SVM token transaction', { error: txError });
    buildTransactionErrorToHttpError(txError.message || '', knownErrors);
  }

  if (!tx) {
    throw new InternalServerError('Failed to build transaction');
  }

  return marshalTransaction(tx);
}

async function marshalTransaction(tx: SolanaTransaction): Promise<BuildTransactionResult> {
  const { data: marshalledHex, error: marshalError } = await tryCatch(
    Promise.resolve(tx.marshalHex())
  );

  if (marshalError) {
    logger.error('Error marshalling SVM transaction', { error: marshalError });
    throw new InternalServerError('Error marshalling transaction');
  }

  const details = await tx.toEIP712Details();

  return { marshalledHex, details };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/services/build-transaction/builders/svm.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/build-transaction/builders/svm.ts tests/unit/services/build-transaction/builders/svm.test.ts
git commit -m "feat(build-tx): add SVM transaction builder"
```

---

## Task 6: Create Remaining Builders (UTXO, TVM, XRP, Substrate)

**Files:**
- Create: `src/services/build-transaction/builders/utxo.ts`
- Create: `src/services/build-transaction/builders/tvm.ts`
- Create: `src/services/build-transaction/builders/xrp.ts`
- Create: `src/services/build-transaction/builders/substrate.ts`

Follow the same pattern as EVM and SVM builders. Adapt from legacy handlers:
- `src/routes/transactions/legacy/build-transaction/utxo/btc-handler.ts`
- `src/routes/transactions/legacy/build-transaction/tvm/tvm-handler.ts`
- `src/routes/transactions/legacy/build-transaction/xrp/xrp-handler.ts`
- `src/routes/transactions/legacy/build-transaction/substrate/bittensor-handler.ts`

**Step 1: Create UTXO builder**

**Step 2: Create TVM builder**

**Step 3: Create XRP builder**

**Step 4: Create Substrate builder**

**Step 5: Commit all**

```bash
git add src/services/build-transaction/builders/*.ts
git commit -m "feat(build-tx): add UTXO, TVM, XRP, and Substrate builders"
```

---

## Task 7: Create SVM Durable Nonce Builder

**Files:**
- Create: `src/services/build-transaction/builders/svm-durable-nonce.ts`
- Test: `tests/unit/services/build-transaction/builders/svm-durable-nonce.test.ts`

**Step 1: Write the failing test**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DurableNonce } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { buildDurableNonceTransaction, getDurableNonceAccount } from '@/src/services/build-transaction/builders/svm-durable-nonce.js';

vi.mock('@iofinnet/io-core-dapp-utils-chains-sdk', async () => {
  const actual = await vi.importActual('@iofinnet/io-core-dapp-utils-chains-sdk');
  return {
    ...actual,
    DurableNonce: {
      isNonceAccountInitialized: vi.fn(),
      fetchNonceAccountInfo: vi.fn(),
    },
  };
});

describe('SVM Durable Nonce Builder', () => {
  let mockWallet: any;
  let mockChain: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWallet = { address: 'walletPubkey' };
    mockChain = {
      TransactionBuilder: {
        getDurableNonceAddress: vi.fn().mockResolvedValue('nonceAccountPubkey'),
        buildCreateNonceAccountTransaction: vi.fn().mockResolvedValue({
          transaction: {
            marshalHex: vi.fn().mockReturnValue('txhex'),
            toEIP712Details: vi.fn().mockResolvedValue([]),
          },
        }),
      },
    };
  });

  describe('buildDurableNonceTransaction', () => {
    it('should build create nonce account transaction', async () => {
      const result = await buildDurableNonceTransaction({
        wallet: mockWallet,
        chain: mockChain,
      });

      expect(mockChain.TransactionBuilder.buildCreateNonceAccountTransaction).toHaveBeenCalledWith({
        from: mockWallet,
      });
      expect(result.marshalledHex).toBe('txhex');
    });
  });

  describe('getDurableNonceAccount', () => {
    it('should return nonce account info when initialized', async () => {
      vi.mocked(DurableNonce.isNonceAccountInitialized).mockResolvedValue(true);
      vi.mocked(DurableNonce.fetchNonceAccountInfo).mockResolvedValue({
        nonce: 'currentNonce',
        authority: 'authorityPubkey',
      } as any);

      const result = await getDurableNonceAccount({
        wallet: mockWallet,
        chain: mockChain,
      });

      expect(result.nonceAccount).toBe('nonceAccountPubkey');
      expect(result.nonce).toBe('currentNonce');
    });

    it('should throw NotFoundError when nonce account not initialized', async () => {
      vi.mocked(DurableNonce.isNonceAccountInitialized).mockResolvedValue(false);

      await expect(getDurableNonceAccount({ wallet: mockWallet, chain: mockChain }))
        .rejects.toThrow('Durable nonce account address not found');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/services/build-transaction/builders/svm-durable-nonce.test.ts`
Expected: FAIL

**Step 3: Write implementation (adapted from legacy)**

```typescript
import { InternalServerError, NotFoundError } from '@iofinnet/errors-sdk';
import {
  DurableNonce,
  type Chain,
  type SolanaChain,
  type SolanaTransactionBuilder,
  type SolanaWallet,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { buildTransactionErrorToHttpError } from '../error-utils.js';
import type { BuildTransactionResult, KnownError } from '../types.js';
import { logger } from '@/utils/powertools.js';
import { tryCatch } from '@/utils/try-catch.js';

export interface DurableNonceParams {
  wallet: SolanaWallet;
  chain: Chain;
}

export interface DurableNonceAccountResult {
  nonceAccount: string;
  nonce?: string;
  authority?: string;
}

const knownErrors = new Map<string, KnownError>([
  ['invalid payer address', { status: 400, message: 'Invalid payer address', path: ['vaultId'] }],
  ['invalid authority address', { status: 400, message: 'Invalid authority address', path: ['vaultId'] }],
  ['insufficient balance for nonce account creation', { status: 400, message: 'Insufficient balance for nonce account creation', path: ['vaultId'] }],
]);

export async function buildDurableNonceTransaction(params: DurableNonceParams): Promise<BuildTransactionResult> {
  const { wallet, chain } = params;

  const { data: tx, error: txError } = await tryCatch(
    (chain.TransactionBuilder as SolanaTransactionBuilder).buildCreateNonceAccountTransaction({
      from: wallet,
    })
  );

  if (txError) {
    logger.error('Error building durable nonce transaction', { error: txError });
    buildTransactionErrorToHttpError(txError.message || '', knownErrors);
  }

  if (!tx) {
    throw new InternalServerError('Failed to build transaction');
  }

  const { data: marshalledHex, error: marshalError } = await tryCatch(
    Promise.resolve(tx.transaction.marshalHex())
  );

  if (marshalError) {
    logger.error('Error marshalling durable nonce transaction', { error: marshalError });
    throw new InternalServerError('Error marshalling transaction');
  }

  const details = await tx.transaction.toEIP712Details();

  return { marshalledHex, details };
}

export async function getDurableNonceAccount(params: DurableNonceParams): Promise<DurableNonceAccountResult> {
  const { wallet, chain } = params;

  const { data: nonceAccount, error: nonceAccountError } = await tryCatch(
    (chain.TransactionBuilder as SolanaTransactionBuilder).getDurableNonceAddress({
      from: wallet,
    })
  );

  if (nonceAccountError) {
    logger.error('Error getting durable nonce address', { error: nonceAccountError });
    throw new InternalServerError(nonceAccountError.message || 'Error getting durable nonce address');
  }

  if (!nonceAccount) {
    throw new NotFoundError('Durable nonce account address not found');
  }

  const isInitialized = await DurableNonce.isNonceAccountInitialized(nonceAccount, chain as SolanaChain);

  if (!isInitialized) {
    throw new NotFoundError('Durable nonce account address not found');
  }

  const { data: accountInfo, error: accountInfoError } = await tryCatch(
    DurableNonce.fetchNonceAccountInfo(nonceAccount, chain as SolanaChain)
  );

  if (accountInfoError) {
    logger.error('Error fetching nonce account info', { error: accountInfoError });
    throw new InternalServerError('Error fetching nonce account info');
  }

  return {
    nonceAccount,
    nonce: accountInfo?.nonce,
    authority: accountInfo?.authority,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/services/build-transaction/builders/svm-durable-nonce.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/build-transaction/builders/svm-durable-nonce.ts tests/unit/services/build-transaction/builders/svm-durable-nonce.test.ts
git commit -m "feat(build-tx): add SVM durable nonce builder"
```

---

## Task 8: Create Router Service

**Files:**
- Create: `src/services/build-transaction/index.ts`
- Test: `tests/unit/services/build-transaction/router.test.ts`

**Step 1: Write the failing test**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { routeNativeTransaction, routeTokenTransaction } from '@/src/services/build-transaction/index.js';
import type { WalletFactory } from '@/src/services/build-transaction/wallet-factory.js';

vi.mock('@/src/services/build-transaction/builders/evm.js', () => ({
  buildEvmNativeTransaction: vi.fn().mockResolvedValue({ marshalledHex: 'evmhex', details: [] }),
  buildEvmTokenTransaction: vi.fn().mockResolvedValue({ marshalledHex: 'evmtokenhex', details: [] }),
}));

vi.mock('@/src/services/build-transaction/builders/svm.js', () => ({
  buildSvmNativeTransaction: vi.fn().mockResolvedValue({ marshalledHex: 'svmhex', details: [] }),
  buildSvmTokenTransaction: vi.fn().mockResolvedValue({ marshalledHex: 'svmtokenhex', details: [] }),
}));

describe('Build Transaction Router', () => {
  let mockWalletFactory: WalletFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWalletFactory = {
      createWallet: vi.fn().mockResolvedValue({
        wallet: { address: '0x123' },
        chain: { Config: { ecosystem: 'evm' } },
      }),
    } as unknown as WalletFactory;
  });

  describe('routeNativeTransaction', () => {
    it('should route EVM transaction to EVM builder', async () => {
      const result = await routeNativeTransaction(
        EcoSystem.EVM,
        'ethereum' as any,
        { vaultId: 'vault-1', amount: '1', to: '0xrecipient' },
        mockWalletFactory
      );

      expect(mockWalletFactory.createWallet).toHaveBeenCalledWith('vault-1', 'ethereum', undefined);
      expect(result.marshalledHex).toBe('evmhex');
    });

    it('should route SVM transaction to SVM builder', async () => {
      const result = await routeNativeTransaction(
        EcoSystem.SVM,
        'solana' as any,
        { vaultId: 'vault-1', amount: '1', to: 'recipient' },
        mockWalletFactory
      );

      expect(result.marshalledHex).toBe('svmhex');
    });

    it('should throw BadRequestError for unsupported ecosystem', async () => {
      await expect(
        routeNativeTransaction(
          'unsupported' as EcoSystem,
          'unknown' as any,
          { vaultId: 'vault-1', amount: '1', to: 'recipient' },
          mockWalletFactory
        )
      ).rejects.toThrow('Unsupported ecosystem/chain');
    });
  });

  describe('routeTokenTransaction', () => {
    it('should route EVM token transaction', async () => {
      const result = await routeTokenTransaction(
        EcoSystem.EVM,
        'ethereum' as any,
        { vaultId: 'vault-1', amount: '100', to: '0xrecipient', tokenAddress: '0xtoken' },
        mockWalletFactory
      );

      expect(result.marshalledHex).toBe('evmtokenhex');
    });

    it('should throw for unsupported token chain (UTXO)', async () => {
      await expect(
        routeTokenTransaction(
          EcoSystem.UTXO,
          'bitcoin' as any,
          { vaultId: 'vault-1', amount: '1', to: 'recipient', tokenAddress: 'token' },
          mockWalletFactory
        )
      ).rejects.toThrow('Token transactions not supported');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/services/build-transaction/router.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
import { BadRequestError } from '@iofinnet/errors-sdk';
import { type ChainAlias, EcoSystem, EvmChainAliases, ChainAlias as ChainAliasEnum } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { buildEvmNativeTransaction, buildEvmTokenTransaction } from './builders/evm.js';
import { buildSvmNativeTransaction, buildSvmTokenTransaction } from './builders/svm.js';
import { buildTvmNativeTransaction, buildTvmTokenTransaction } from './builders/tvm.js';
import { buildUtxoNativeTransaction } from './builders/utxo.js';
import { buildXrpNativeTransaction } from './builders/xrp.js';
import { buildSubstrateNativeTransaction } from './builders/substrate.js';
import type { BuildTransactionResult, BuilderKey } from './types.js';
import type { WalletFactory } from './wallet-factory.js';

export * from './types.js';
export * from './wallet-factory.js';

interface NativeRouteParams {
  vaultId: string;
  amount: string;
  to: string;
  derivationPath?: string;
  [key: string]: unknown;
}

interface TokenRouteParams extends NativeRouteParams {
  tokenAddress: string;
}

type NativeBuilderFn = (params: any) => Promise<BuildTransactionResult>;
type TokenBuilderFn = (params: any) => Promise<BuildTransactionResult>;

// Build native builder registry
const nativeBuilders: Partial<Record<BuilderKey, NativeBuilderFn>> = {
  // EVM chains
  ...Object.fromEntries(
    Object.values(EvmChainAliases).map((alias) => [`${EcoSystem.EVM}:${alias}` as BuilderKey, buildEvmNativeTransaction])
  ),
  // SVM
  [`${EcoSystem.SVM}:${ChainAliasEnum.SOLANA}`]: buildSvmNativeTransaction,
  // UTXO
  [`${EcoSystem.UTXO}:${ChainAliasEnum.BITCOIN}`]: buildUtxoNativeTransaction,
  [`${EcoSystem.UTXO}:${ChainAliasEnum.MNEE}`]: buildUtxoNativeTransaction,
  // TVM
  [`${EcoSystem.TVM}:${ChainAliasEnum.TRON}`]: buildTvmNativeTransaction,
  // XRP
  [`${EcoSystem.XRP}:${ChainAliasEnum.XRP}`]: buildXrpNativeTransaction,
  // Substrate
  [`${EcoSystem.SUBSTRATE}:${ChainAliasEnum.BITTENSOR}`]: buildSubstrateNativeTransaction,
};

// Build token builder registry (subset of chains that support tokens)
const tokenBuilders: Partial<Record<BuilderKey, TokenBuilderFn>> = {
  // EVM chains
  ...Object.fromEntries(
    Object.values(EvmChainAliases).map((alias) => [`${EcoSystem.EVM}:${alias}` as BuilderKey, buildEvmTokenTransaction])
  ),
  // SVM
  [`${EcoSystem.SVM}:${ChainAliasEnum.SOLANA}`]: buildSvmTokenTransaction,
  // TVM
  [`${EcoSystem.TVM}:${ChainAliasEnum.TRON}`]: buildTvmTokenTransaction,
};

export async function routeNativeTransaction(
  ecosystem: EcoSystem,
  chainAlias: ChainAlias,
  params: NativeRouteParams,
  walletFactory: WalletFactory
): Promise<BuildTransactionResult> {
  const key = `${ecosystem}:${chainAlias}` as BuilderKey;
  const builder = nativeBuilders[key];

  if (!builder) {
    throw new BadRequestError(`Unsupported ecosystem/chain: ${key}`);
  }

  const { wallet, chain } = await walletFactory.createWallet(
    params.vaultId,
    chainAlias,
    params.derivationPath
  );

  return builder({ ...params, wallet, chain });
}

export async function routeTokenTransaction(
  ecosystem: EcoSystem,
  chainAlias: ChainAlias,
  params: TokenRouteParams,
  walletFactory: WalletFactory
): Promise<BuildTransactionResult> {
  const key = `${ecosystem}:${chainAlias}` as BuilderKey;
  const builder = tokenBuilders[key];

  if (!builder) {
    throw new BadRequestError(`Token transactions not supported for: ${key}`);
  }

  const { wallet, chain } = await walletFactory.createWallet(
    params.vaultId,
    chainAlias,
    params.derivationPath
  );

  return builder({ ...params, wallet, chain });
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/services/build-transaction/router.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/build-transaction/index.ts tests/unit/services/build-transaction/router.test.ts
git commit -m "feat(build-tx): add transaction router service"
```

---

## Task 9: Create Route Schemas

**Files:**
- Create: `src/routes/transactions/build/schemas.ts`

**Step 1: Create schemas file**

```typescript
import { EcoSystem, EvmChainAliases, ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { z } from 'zod';

// ==================== Path Parameters ====================

export const buildTransactionPathParamsSchema = z.object({
  vaultId: z.string().min(1, 'Vault ID is required'),
  ecosystem: z.nativeEnum(EcoSystem),
  chainAlias: z.string().min(1, 'Chain alias is required'),
});

export const svmDurableNoncePathParamsSchema = z.object({
  vaultId: z.string().min(1, 'Vault ID is required'),
});

export type BuildTransactionPathParams = z.infer<typeof buildTransactionPathParamsSchema>;
export type SvmDurableNoncePathParams = z.infer<typeof svmDurableNoncePathParamsSchema>;

// ==================== Body Schemas ====================

const baseTransactionBodySchema = z.object({
  amount: z.string().refine(
    (val) => val.toUpperCase() === 'MAX' || !Number.isNaN(Number(val)),
    { message: 'Amount must be a numeric string or "MAX"' }
  ),
  to: z.string().min(1, 'Recipient address is required'),
  derivationPath: z.string().optional(),
});

// Shared gasPrice schema
const gasPriceSchema = z
  .string()
  .optional()
  .refine(
    (val) => val === undefined || (val.trim() !== '' && !Number.isNaN(Number(val)) && Number(val) >= 0),
    { message: 'Invalid gasPrice: must be a non-negative number' }
  );

export const evmNativeBodySchema = baseTransactionBodySchema.extend({
  gasPrice: gasPriceSchema,
  gasLimit: z.string().optional(),
  data: z.string().optional(),
  nonce: z.number().optional(),
  type: z.enum(['legacy', 'eip1559']).optional(),
  maxFeePerGas: z.string().optional(),
  maxPriorityFeePerGas: z.string().optional(),
});

export const evmTokenBodySchema = evmNativeBodySchema.extend({
  tokenAddress: z.string().min(1, 'Token address is required'),
});

export const svmNativeBodySchema = baseTransactionBodySchema.extend({
  nonceAccount: z.string().optional(),
});

export const svmTokenBodySchema = svmNativeBodySchema.extend({
  tokenAddress: z.string().min(1, 'Token address is required'),
});

export const tvmNativeBodySchema = baseTransactionBodySchema;

export const tvmTokenBodySchema = tvmNativeBodySchema.extend({
  tokenAddress: z.string().min(1, 'Token address is required'),
});

export const utxoNativeBodySchema = baseTransactionBodySchema.extend({
  feeRate: z.number().optional(),
});

export const xrpNativeBodySchema = baseTransactionBodySchema.extend({
  memo: z.string().optional(),
  tag: z.number().optional(),
});

export const substrateNativeBodySchema = baseTransactionBodySchema;

export const svmDurableNonceBodySchema = z.object({
  derivationPath: z.string().optional(),
});

export const svmDurableNonceQuerySchema = z.object({
  derivationPath: z.string().optional(),
});

// ==================== Response Schemas ====================

export const buildTransactionResponseSchema = z.object({
  marshalledHex: z.string(),
  details: z.array(z.object({
    name: z.string(),
    type: z.string(),
    value: z.string(),
  })),
});

export const durableNonceResponseSchema = z.object({
  nonceAccount: z.string(),
  nonce: z.string().optional(),
  authority: z.string().optional(),
});

export type BuildTransactionResponse = z.infer<typeof buildTransactionResponseSchema>;
export type DurableNonceResponse = z.infer<typeof durableNonceResponseSchema>;
```

**Step 2: Commit**

```bash
git add src/routes/transactions/build/schemas.ts
git commit -m "feat(build-tx): add route schemas"
```

---

## Task 10: Create Route Handlers

**Files:**
- Create: `src/routes/transactions/build/handlers.ts`

**Step 1: Create handlers file**

```typescript
import { NotFoundError, OperationForbiddenError } from '@iofinnet/errors-sdk';
import { ChainAlias, EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { routeNativeTransaction, routeTokenTransaction } from '@/src/services/build-transaction/index.js';
import { buildDurableNonceTransaction, getDurableNonceAccount } from '@/src/services/build-transaction/builders/svm-durable-nonce.js';
import { logger } from '@/utils/powertools.js';
import type {
  BuildTransactionPathParams,
  SvmDurableNoncePathParams,
} from './schemas.js';

// ==================== Helper Functions ====================

async function verifyVaultOwnership(
  server: FastifyRequest['server'],
  vaultId: string,
  authOrgId: string
): Promise<void> {
  const vaultDetails = await server.services.vault.getVaultDetails(vaultId);
  if (!vaultDetails) {
    throw new NotFoundError(`Vault not found for id ${vaultId}`);
  }
  if (authOrgId !== vaultDetails.organisationId) {
    logger.warn('Organisation mismatch - vault ownership check failed', {
      authOrgId,
      vaultOrgId: vaultDetails.organisationId,
      vaultId,
    });
    throw new OperationForbiddenError('Forbidden');
  }
}

// ==================== Route Handlers ====================

/**
 * POST /ecosystem/:ecosystem/chainAlias/:chainAlias/build-native-transaction
 */
export async function buildNativeTransaction(
  request: FastifyRequest<{
    Params: BuildTransactionPathParams;
    Body: Record<string, unknown>;
  }>,
  reply: FastifyReply
) {
  const { vaultId, ecosystem, chainAlias } = request.params;
  const { organisationId: authOrgId } = request.auth!;

  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  const result = await routeNativeTransaction(
    ecosystem as EcoSystem,
    chainAlias as ChainAlias,
    { vaultId, ...request.body },
    request.server.services.walletFactory
  );

  return reply.status(201).send(result);
}

/**
 * POST /ecosystem/:ecosystem/chainAlias/:chainAlias/build-token-transaction
 */
export async function buildTokenTransaction(
  request: FastifyRequest<{
    Params: BuildTransactionPathParams;
    Body: Record<string, unknown>;
  }>,
  reply: FastifyReply
) {
  const { vaultId, ecosystem, chainAlias } = request.params;
  const { organisationId: authOrgId } = request.auth!;

  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  const result = await routeTokenTransaction(
    ecosystem as EcoSystem,
    chainAlias as ChainAlias,
    { vaultId, ...request.body } as any,
    request.server.services.walletFactory
  );

  return reply.status(201).send(result);
}

/**
 * POST /ecosystem/svm/chainAlias/solana/build-durable-nonce-transaction
 */
export async function buildDurableNonceTransactionHandler(
  request: FastifyRequest<{
    Params: SvmDurableNoncePathParams;
    Body: { derivationPath?: string };
  }>,
  reply: FastifyReply
) {
  const { vaultId } = request.params;
  const { derivationPath } = request.body ?? {};
  const { organisationId: authOrgId } = request.auth!;

  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  const { wallet, chain } = await request.server.services.walletFactory.createWallet(
    vaultId,
    ChainAlias.SOLANA,
    derivationPath
  );

  const result = await buildDurableNonceTransaction({ wallet, chain });

  return reply.status(201).send(result);
}

/**
 * GET /ecosystem/svm/chainAlias/solana/durable-nonce
 */
export async function getDurableNonceHandler(
  request: FastifyRequest<{
    Params: SvmDurableNoncePathParams;
    Querystring: { derivationPath?: string };
  }>,
  reply: FastifyReply
) {
  const { vaultId } = request.params;
  const { derivationPath } = request.query;
  const { organisationId: authOrgId } = request.auth!;

  await verifyVaultOwnership(request.server, vaultId, authOrgId);

  const { wallet, chain } = await request.server.services.walletFactory.createWallet(
    vaultId,
    ChainAlias.SOLANA,
    derivationPath
  );

  const result = await getDurableNonceAccount({ wallet, chain });

  return reply.status(200).send(result);
}
```

**Step 2: Commit**

```bash
git add src/routes/transactions/build/handlers.ts
git commit -m "feat(build-tx): add route handlers"
```

---

## Task 11: Create Route Registration

**Files:**
- Create: `src/routes/transactions/build/index.ts`
- Modify: `src/routes/transactions/index.ts`

**Step 1: Create route registration file**

```typescript
import type { FastifyInstance } from 'fastify';
import chainValidationPlugin from '@/src/plugins/chain-validation.js';
import {
  buildNativeTransaction,
  buildTokenTransaction,
  buildDurableNonceTransactionHandler,
  getDurableNonceHandler,
} from './handlers.js';
import {
  buildTransactionPathParamsSchema,
  buildTransactionResponseSchema,
  svmDurableNoncePathParamsSchema,
  svmDurableNonceBodySchema,
  svmDurableNonceQuerySchema,
  durableNonceResponseSchema,
} from './schemas.js';

/**
 * Build transaction routes - vault-scoped
 * Registered under /v2/vaults/:vaultId/transactions
 */
export default async function buildTransactionRoutes(fastify: FastifyInstance) {
  await fastify.register(chainValidationPlugin);

  // ==================== Native Transaction ====================

  fastify.post(
    '/ecosystem/:ecosystem/chain/:chainAlias/build-native-transaction',
    {
      schema: {
        tags: ['Build Transactions'],
        summary: 'Build native currency transaction',
        description: 'Builds an unsigned transaction for native currency transfer (ETH, SOL, BTC, etc.)',
        params: buildTransactionPathParamsSchema,
        response: {
          201: buildTransactionResponseSchema,
        },
      },
    },
    buildNativeTransaction
  );

  // ==================== Token Transaction ====================

  fastify.post(
    '/ecosystem/:ecosystem/chain/:chainAlias/build-token-transaction',
    {
      schema: {
        tags: ['Build Transactions'],
        summary: 'Build token transaction',
        description: 'Builds an unsigned transaction for token transfer (ERC20, SPL, TRC20)',
        params: buildTransactionPathParamsSchema,
        response: {
          201: buildTransactionResponseSchema,
        },
      },
    },
    buildTokenTransaction
  );

  // ==================== Solana Durable Nonce ====================

  fastify.post(
    '/ecosystem/svm/chain/solana/build-durable-nonce-transaction',
    {
      schema: {
        tags: ['Build Transactions'],
        summary: 'Build durable nonce account creation transaction',
        description: 'Builds a transaction to create a Solana durable nonce account',
        params: svmDurableNoncePathParamsSchema,
        body: svmDurableNonceBodySchema,
        response: {
          201: buildTransactionResponseSchema,
        },
      },
    },
    buildDurableNonceTransactionHandler
  );

  fastify.get(
    '/ecosystem/svm/chain/solana/durable-nonce',
    {
      schema: {
        tags: ['Build Transactions'],
        summary: 'Get durable nonce account info',
        description: 'Retrieves information about the Solana durable nonce account',
        params: svmDurableNoncePathParamsSchema,
        querystring: svmDurableNonceQuerySchema,
        response: {
          200: durableNonceResponseSchema,
        },
      },
    },
    getDurableNonceHandler
  );
}
```

**Step 2: Register build routes in transactions/index.ts**

Add import at top of `src/routes/transactions/index.ts`:
```typescript
import buildTransactionRoutes from './build/index.js';
```

Modify `vaultTransactionRoutes` function to register build routes:
```typescript
export async function vaultTransactionRoutes(fastify: FastifyInstance) {
  await fastify.register(chainValidationPlugin);
  await fastify.register(buildTransactionRoutes);
  // ... existing routes
}
```

**Step 3: Commit**

```bash
git add src/routes/transactions/build/index.ts src/routes/transactions/index.ts
git commit -m "feat(build-tx): register build transaction routes"
```

---

## Task 12: Register WalletFactory Service

**Files:**
- Modify: `src/app.ts` (or wherever services are registered)

**Step 1: Find service registration location**

Check how other services like `vault` and `addresses` are registered on the Fastify instance.

**Step 2: Add WalletFactory registration**

```typescript
import { WalletFactory } from '@/src/services/build-transaction/wallet-factory.js';

// In the service registration section:
server.decorate('services', {
  ...existingServices,
  walletFactory: new WalletFactory(vaultService),
});
```

**Step 3: Add TypeScript declaration**

Update `src/types/fastify.d.ts` (or create if needed):
```typescript
import type { WalletFactory } from '@/src/services/build-transaction/wallet-factory.js';

declare module 'fastify' {
  interface FastifyInstance {
    services: {
      // ... existing services
      walletFactory: WalletFactory;
    };
  }
}
```

**Step 4: Commit**

```bash
git add src/app.ts src/types/fastify.d.ts
git commit -m "feat(build-tx): register WalletFactory service"
```

---

## Task 13: Update Integration Tests

**Files:**
- Modify: `tests/integration/transactions/build-transaction.test.ts`

**Step 1: Update endpoint paths to match new routes**

The existing tests use paths like `/transactions/ecosystem/evm/chainAlias/eth/build-native-transaction`.

Update `buildVaultEndpoint` calls to ensure they match the new route structure.

**Step 2: Add tests for new endpoints**

Add test cases for:
- Token transactions (EVM, SVM, TVM)
- Durable nonce transaction (Solana)
- Durable nonce GET (Solana)

**Step 3: Run integration tests**

Run: `npm run test:integration -- tests/integration/transactions/build-transaction.test.ts`
Expected: PASS (some skipped tests expected for unfunded wallets)

**Step 4: Commit**

```bash
git add tests/integration/transactions/build-transaction.test.ts
git commit -m "test(build-tx): update integration tests for new routes"
```

---

## Task 14: Run Full Test Suite and Fix Issues

**Step 1: Run unit tests**

Run: `npm run test:unit`
Expected: PASS

**Step 2: Run integration tests**

Run: `npm run test:integration`
Expected: PASS

**Step 3: Run type check**

Run: `npm run typecheck`
Expected: No errors

**Step 4: Run linter**

Run: `npm run lint`
Expected: No errors

**Step 5: Fix any issues found**

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore(build-tx): fix issues from full test suite"
```

---

## Summary

This plan creates the build transaction feature in 14 tasks:

1. Shared types and interfaces
2. WalletFactory service (with tests)
3. Error utilities
4. EVM builder (with tests)
5. SVM builder (with tests)
6. Remaining builders (UTXO, TVM, XRP, Substrate)
7. SVM durable nonce builder (with tests)
8. Router service (with tests)
9. Route schemas
10. Route handlers
11. Route registration
12. WalletFactory service registration
13. Integration test updates
14. Full test suite verification

Each task follows TDD: write failing test, implement, verify pass, commit.
