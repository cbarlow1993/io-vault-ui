# Transaction Processor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a chain-agnostic transaction processor that classifies transactions, upserts to PostgreSQL, and discovers token metadata.

**Architecture:** TransactionProcessor orchestrates ChainFetcher (EVM/SVM RPC), Classifier (custom detection with Noves fallback), and Upserter (transactions + tokens). Integrates with existing reconciliation worker.

**Tech Stack:** Fastify, Kysely, TypeScript, ethers.js (EVM), @solana/web3.js (SVM), CoinGecko API.

---

## Task 1: Core Types and Interfaces

**Files:**
- Create: `src/services/transaction-processor/types.ts`
- Test: `tests/unit/services/transaction-processor/types.test.ts`

**Step 1: Create the types file**

```typescript
// src/services/transaction-processor/types.ts

/**
 * Classification types for transactions.
 */
export type ClassificationType =
  | 'transfer'
  | 'swap'
  | 'bridge'
  | 'stake'
  | 'mint'
  | 'burn'
  | 'approve'
  | 'contract_deploy'
  | 'nft_transfer'
  | 'unknown';

/**
 * Confidence level of the classification.
 */
export type ClassificationConfidence = 'high' | 'medium' | 'low';

/**
 * Source of the classification result.
 */
export type ClassificationSource = 'custom' | 'noves';

/**
 * Token information extracted from a transfer.
 */
export interface TokenInfo {
  address: string;
  symbol?: string;
  name?: string;
  decimals?: number;
}

/**
 * A parsed transfer from a transaction.
 */
export interface ParsedTransfer {
  type: 'native' | 'token' | 'nft';
  direction: 'in' | 'out';
  from: string;
  to: string;
  amount: string;
  token?: TokenInfo;
  tokenId?: string; // For NFTs
}

/**
 * Result of classifying a transaction.
 */
export interface ClassificationResult {
  type: ClassificationType;
  confidence: ClassificationConfidence;
  source: ClassificationSource;
  label: string;
  protocol?: string;
  transfers: ParsedTransfer[];
}

/**
 * EVM-specific transaction data for classification.
 */
export interface EvmTransactionData {
  type: 'evm';
  hash: string;
  from: string;
  to: string | null;
  value: string;
  input: string;
  gasUsed: string;
  gasPrice: string;
  logs: EvmTransactionLog[];
  blockNumber: number;
  blockHash: string;
  timestamp: Date;
  status: 'success' | 'failed';
}

/**
 * EVM transaction log (event).
 */
export interface EvmTransactionLog {
  address: string;
  topics: string[];
  data: string;
  logIndex: number;
}

/**
 * SVM-specific transaction data for classification.
 */
export interface SvmTransactionData {
  type: 'svm';
  signature: string;
  slot: number;
  blockTime: number;
  fee: number;
  status: 'success' | 'failed';
  instructions: SvmInstruction[];
  preBalances: number[];
  postBalances: number[];
  preTokenBalances: SvmTokenBalance[];
  postTokenBalances: SvmTokenBalance[];
}

/**
 * SVM instruction.
 */
export interface SvmInstruction {
  programId: string;
  accounts: string[];
  data: string;
}

/**
 * SVM token balance.
 */
export interface SvmTokenBalance {
  accountIndex: number;
  mint: string;
  owner: string;
  uiTokenAmount: {
    amount: string;
    decimals: number;
  };
}

/**
 * Raw transaction data from chain fetcher.
 */
export type RawTransaction = EvmTransactionData | SvmTransactionData;

/**
 * Normalized transaction for upserting.
 */
export interface NormalizedTransaction {
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
}

/**
 * Result of processing a transaction.
 */
export interface ProcessResult {
  transactionId: string;
  classificationType: ClassificationType;
  tokensDiscovered: number;
  tokensUpserted: number;
}

/**
 * Interface for chain fetchers.
 */
export interface ChainFetcher {
  fetch(chain: string, network: string, txHash: string): Promise<RawTransaction>;
}

/**
 * Interface for classifiers.
 */
export interface Classifier {
  classify(tx: RawTransaction): Promise<ClassificationResult>;
}

/**
 * Interface for the transaction upserter.
 */
export interface TransactionUpserter {
  upsert(
    normalized: NormalizedTransaction,
    classification: ClassificationResult,
    tokens: TokenInfo[]
  ): Promise<ProcessResult>;
}
```

**Step 2: Verify file compiles**

Run: `cd services/core && npx tsc --noEmit src/services/transaction-processor/types.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/services/transaction-processor/types.ts
git commit -m "feat(transaction-processor): add core types and interfaces"
```

---

## Task 2: Token Metadata Fetcher

**Files:**
- Create: `src/services/transaction-processor/token-metadata-fetcher.ts`
- Test: `tests/unit/services/transaction-processor/token-metadata-fetcher.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/services/transaction-processor/token-metadata-fetcher.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock ethers
vi.mock('ethers', () => ({
  JsonRpcProvider: vi.fn().mockImplementation(() => ({
    // Provider mock
  })),
  Contract: vi.fn().mockImplementation(() => ({
    name: vi.fn().mockResolvedValue('Test Token'),
    symbol: vi.fn().mockResolvedValue('TEST'),
    decimals: vi.fn().mockResolvedValue(18),
  })),
}));

import { TokenMetadataFetcher } from '@/services/core/src/services/transaction-processor/token-metadata-fetcher';

describe('TokenMetadataFetcher', () => {
  let fetcher: TokenMetadataFetcher;

  beforeEach(() => {
    vi.clearAllMocks();
    fetcher = new TokenMetadataFetcher({
      coinGeckoApiUrl: 'https://api.coingecko.com/api/v3',
      coinGeckoApiKey: 'test-key',
    });
  });

  describe('fetchOnChain', () => {
    it('fetches token metadata from EVM chain via RPC', async () => {
      const result = await fetcher.fetchOnChain(
        'ethereum',
        'mainnet',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );

      expect(result).toEqual({
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
      });
    });

    it('returns partial data when some calls fail', async () => {
      const { Contract } = await import('ethers');
      (Contract as unknown as vi.Mock).mockImplementationOnce(() => ({
        name: vi.fn().mockRejectedValue(new Error('revert')),
        symbol: vi.fn().mockResolvedValue('TEST'),
        decimals: vi.fn().mockResolvedValue(18),
      }));

      const result = await fetcher.fetchOnChain(
        'ethereum',
        'mainnet',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );

      expect(result.name).toBeUndefined();
      expect(result.symbol).toBe('TEST');
    });
  });

  describe('fetchFromCoinGecko', () => {
    it('fetches token metadata from CoinGecko', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'usd-coin',
            symbol: 'usdc',
            name: 'USD Coin',
            image: { large: 'https://example.com/usdc.png' },
          }),
      });

      const result = await fetcher.fetchFromCoinGecko(
        'ethereum',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );

      expect(result).toEqual({
        coingeckoId: 'usd-coin',
        logoUri: 'https://example.com/usdc.png',
      });
    });

    it('returns null when token not found on CoinGecko', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetcher.fetchFromCoinGecko(
        'ethereum',
        '0xunknown'
      );

      expect(result).toBeNull();
    });
  });

  describe('fetch', () => {
    it('combines on-chain and CoinGecko data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'usd-coin',
            image: { large: 'https://example.com/usdc.png' },
          }),
      });

      const result = await fetcher.fetch(
        'ethereum',
        'mainnet',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );

      expect(result.name).toBe('Test Token');
      expect(result.symbol).toBe('TEST');
      expect(result.decimals).toBe(18);
      expect(result.coingeckoId).toBe('usd-coin');
      expect(result.logoUri).toBe('https://example.com/usdc.png');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/token-metadata-fetcher.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Implement TokenMetadataFetcher**

```typescript
// src/services/transaction-processor/token-metadata-fetcher.ts
import { JsonRpcProvider, Contract } from 'ethers';
import type { TokenInfo } from './types';

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

// Chain to CoinGecko platform ID mapping
const CHAIN_TO_COINGECKO_PLATFORM: Record<string, string> = {
  ethereum: 'ethereum',
  polygon: 'polygon-pos',
  arbitrum: 'arbitrum-one',
  optimism: 'optimistic-ethereum',
  base: 'base',
  avalanche: 'avalanche',
  bsc: 'binance-smart-chain',
};

// Chain to RPC URL mapping (use config in real implementation)
const CHAIN_TO_RPC: Record<string, string> = {
  ethereum: 'https://eth.llamarpc.com',
  polygon: 'https://polygon.llamarpc.com',
  arbitrum: 'https://arbitrum.llamarpc.com',
  optimism: 'https://optimism.llamarpc.com',
  base: 'https://base.llamarpc.com',
};

export interface TokenMetadataFetcherConfig {
  coinGeckoApiUrl: string;
  coinGeckoApiKey?: string;
  rpcUrls?: Record<string, string>;
}

export interface TokenMetadataResult extends TokenInfo {
  coingeckoId?: string;
  logoUri?: string;
}

export class TokenMetadataFetcher {
  private readonly coinGeckoApiUrl: string;
  private readonly coinGeckoApiKey?: string;
  private readonly rpcUrls: Record<string, string>;

  constructor(config: TokenMetadataFetcherConfig) {
    this.coinGeckoApiUrl = config.coinGeckoApiUrl;
    this.coinGeckoApiKey = config.coinGeckoApiKey;
    this.rpcUrls = config.rpcUrls ?? CHAIN_TO_RPC;
  }

  /**
   * Fetches token metadata from on-chain RPC calls.
   */
  async fetchOnChain(
    chain: string,
    network: string,
    address: string
  ): Promise<Partial<TokenInfo>> {
    const rpcUrl = this.rpcUrls[chain];
    if (!rpcUrl) {
      return { address: address.toLowerCase() };
    }

    const provider = new JsonRpcProvider(rpcUrl);
    const contract = new Contract(address, ERC20_ABI, provider);

    const result: Partial<TokenInfo> = {
      address: address.toLowerCase(),
    };

    // Fetch each field separately to handle partial failures
    try {
      result.name = await contract.name();
    } catch {
      // Token may not have name() function
    }

    try {
      result.symbol = await contract.symbol();
    } catch {
      // Token may not have symbol() function
    }

    try {
      result.decimals = await contract.decimals();
    } catch {
      // Token may not have decimals() function
    }

    return result;
  }

  /**
   * Fetches token metadata from CoinGecko.
   */
  async fetchFromCoinGecko(
    chain: string,
    address: string
  ): Promise<{ coingeckoId: string; logoUri: string } | null> {
    const platform = CHAIN_TO_COINGECKO_PLATFORM[chain];
    if (!platform) {
      return null;
    }

    const url = `${this.coinGeckoApiUrl}/coins/${platform}/contract/${address.toLowerCase()}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.coinGeckoApiKey) {
      headers['x-cg-pro-api-key'] = this.coinGeckoApiKey;
    }

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        coingeckoId: data.id,
        logoUri: data.image?.large ?? data.image?.small ?? null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetches complete token metadata from on-chain + CoinGecko.
   */
  async fetch(
    chain: string,
    network: string,
    address: string
  ): Promise<TokenMetadataResult> {
    const [onChain, coinGecko] = await Promise.all([
      this.fetchOnChain(chain, network, address),
      this.fetchFromCoinGecko(chain, address),
    ]);

    return {
      address: address.toLowerCase(),
      name: onChain.name,
      symbol: onChain.symbol,
      decimals: onChain.decimals,
      coingeckoId: coinGecko?.coingeckoId,
      logoUri: coinGecko?.logoUri,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/token-metadata-fetcher.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/transaction-processor/token-metadata-fetcher.ts tests/unit/services/transaction-processor/token-metadata-fetcher.test.ts
git commit -m "feat(transaction-processor): add token metadata fetcher"
```

---

## Task 3: EVM Chain Fetcher

**Files:**
- Create: `src/services/transaction-processor/chain-fetcher/evm-fetcher.ts`
- Test: `tests/unit/services/transaction-processor/chain-fetcher/evm-fetcher.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/services/transaction-processor/chain-fetcher/evm-fetcher.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ethers
const mockGetTransaction = vi.fn();
const mockGetTransactionReceipt = vi.fn();
const mockGetBlock = vi.fn();

vi.mock('ethers', () => ({
  JsonRpcProvider: vi.fn().mockImplementation(() => ({
    getTransaction: mockGetTransaction,
    getTransactionReceipt: mockGetTransactionReceipt,
    getBlock: mockGetBlock,
  })),
}));

import { EvmChainFetcher } from '@/services/core/src/services/transaction-processor/chain-fetcher/evm-fetcher';

describe('EvmChainFetcher', () => {
  let fetcher: EvmChainFetcher;

  beforeEach(() => {
    vi.clearAllMocks();
    fetcher = new EvmChainFetcher({
      rpcUrls: {
        ethereum: 'https://eth.example.com',
      },
    });

    mockGetTransaction.mockResolvedValue({
      hash: '0xabc123',
      from: '0xsender',
      to: '0xrecipient',
      value: BigInt('1000000000000000000'),
      data: '0x',
      gasPrice: BigInt('20000000000'),
      blockNumber: 12345678,
      blockHash: '0xblockhash',
    });

    mockGetTransactionReceipt.mockResolvedValue({
      status: 1,
      gasUsed: BigInt('21000'),
      logs: [],
    });

    mockGetBlock.mockResolvedValue({
      timestamp: 1704067200,
    });
  });

  it('fetches and normalizes EVM transaction', async () => {
    const result = await fetcher.fetch('ethereum', 'mainnet', '0xabc123');

    expect(result.type).toBe('evm');
    expect(result.hash).toBe('0xabc123');
    expect(result.from).toBe('0xsender');
    expect(result.to).toBe('0xrecipient');
    expect(result.value).toBe('1000000000000000000');
    expect(result.status).toBe('success');
  });

  it('returns failed status for reverted transactions', async () => {
    mockGetTransactionReceipt.mockResolvedValue({
      status: 0,
      gasUsed: BigInt('21000'),
      logs: [],
    });

    const result = await fetcher.fetch('ethereum', 'mainnet', '0xabc123');

    expect(result.status).toBe('failed');
  });

  it('includes transaction logs', async () => {
    mockGetTransactionReceipt.mockResolvedValue({
      status: 1,
      gasUsed: BigInt('50000'),
      logs: [
        {
          address: '0xtoken',
          topics: ['0xtopic1', '0xtopic2'],
          data: '0xdata',
          index: 0,
        },
      ],
    });

    const result = await fetcher.fetch('ethereum', 'mainnet', '0xabc123');

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].address).toBe('0xtoken');
  });

  it('throws when transaction not found', async () => {
    mockGetTransaction.mockResolvedValue(null);

    await expect(
      fetcher.fetch('ethereum', 'mainnet', '0xnotfound')
    ).rejects.toThrow('Transaction not found');
  });

  it('throws for unsupported chain', async () => {
    await expect(
      fetcher.fetch('unsupported', 'mainnet', '0xabc123')
    ).rejects.toThrow('Unsupported chain');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/chain-fetcher/evm-fetcher.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Implement EvmChainFetcher**

```typescript
// src/services/transaction-processor/chain-fetcher/evm-fetcher.ts
import { JsonRpcProvider } from 'ethers';
import type { ChainFetcher, EvmTransactionData, EvmTransactionLog } from '../types';

export interface EvmChainFetcherConfig {
  rpcUrls: Record<string, string>;
}

export class EvmChainFetcher implements ChainFetcher {
  private readonly rpcUrls: Record<string, string>;
  private readonly providers: Map<string, JsonRpcProvider> = new Map();

  constructor(config: EvmChainFetcherConfig) {
    this.rpcUrls = config.rpcUrls;
  }

  private getProvider(chain: string): JsonRpcProvider {
    let provider = this.providers.get(chain);
    if (!provider) {
      const rpcUrl = this.rpcUrls[chain];
      if (!rpcUrl) {
        throw new Error(`Unsupported chain: ${chain}`);
      }
      provider = new JsonRpcProvider(rpcUrl);
      this.providers.set(chain, provider);
    }
    return provider;
  }

  async fetch(chain: string, network: string, txHash: string): Promise<EvmTransactionData> {
    const provider = this.getProvider(chain);

    const [tx, receipt] = await Promise.all([
      provider.getTransaction(txHash),
      provider.getTransactionReceipt(txHash),
    ]);

    if (!tx) {
      throw new Error(`Transaction not found: ${txHash}`);
    }

    if (!receipt) {
      throw new Error(`Transaction receipt not found: ${txHash}`);
    }

    const block = await provider.getBlock(tx.blockNumber!);
    if (!block) {
      throw new Error(`Block not found: ${tx.blockNumber}`);
    }

    const logs: EvmTransactionLog[] = receipt.logs.map((log) => ({
      address: log.address,
      topics: [...log.topics],
      data: log.data,
      logIndex: log.index,
    }));

    return {
      type: 'evm',
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value.toString(),
      input: tx.data,
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: tx.gasPrice?.toString() ?? '0',
      logs,
      blockNumber: tx.blockNumber!,
      blockHash: tx.blockHash!,
      timestamp: new Date(block.timestamp * 1000),
      status: receipt.status === 1 ? 'success' : 'failed',
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/chain-fetcher/evm-fetcher.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/transaction-processor/chain-fetcher/evm-fetcher.ts tests/unit/services/transaction-processor/chain-fetcher/evm-fetcher.test.ts
git commit -m "feat(transaction-processor): add EVM chain fetcher"
```

---

## Task 4: SVM Chain Fetcher

**Files:**
- Create: `src/services/transaction-processor/chain-fetcher/svm-fetcher.ts`
- Test: `tests/unit/services/transaction-processor/chain-fetcher/svm-fetcher.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/services/transaction-processor/chain-fetcher/svm-fetcher.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetTransaction = vi.fn();

vi.mock('@solana/web3.js', () => ({
  Connection: vi.fn().mockImplementation(() => ({
    getTransaction: mockGetTransaction,
  })),
}));

import { SvmChainFetcher } from '@/services/core/src/services/transaction-processor/chain-fetcher/svm-fetcher';

describe('SvmChainFetcher', () => {
  let fetcher: SvmChainFetcher;

  beforeEach(() => {
    vi.clearAllMocks();
    fetcher = new SvmChainFetcher({
      rpcUrls: {
        solana: 'https://api.mainnet-beta.solana.com',
      },
    });

    mockGetTransaction.mockResolvedValue({
      slot: 123456789,
      blockTime: 1704067200,
      meta: {
        fee: 5000,
        err: null,
        preBalances: [1000000000, 0],
        postBalances: [999995000, 5000],
        preTokenBalances: [],
        postTokenBalances: [],
      },
      transaction: {
        message: {
          compiledInstructions: [
            {
              programIdIndex: 0,
              accountKeyIndexes: [1, 2],
              data: Buffer.from('test'),
            },
          ],
          staticAccountKeys: [
            { toBase58: () => '11111111111111111111111111111111' },
            { toBase58: () => 'sender111111111111111111111111111111' },
            { toBase58: () => 'recipient11111111111111111111111111' },
          ],
        },
      },
    });
  });

  it('fetches and normalizes SVM transaction', async () => {
    const result = await fetcher.fetch('solana', 'mainnet', 'signature123');

    expect(result.type).toBe('svm');
    expect(result.signature).toBe('signature123');
    expect(result.slot).toBe(123456789);
    expect(result.fee).toBe(5000);
    expect(result.status).toBe('success');
  });

  it('returns failed status for errored transactions', async () => {
    mockGetTransaction.mockResolvedValue({
      slot: 123456789,
      blockTime: 1704067200,
      meta: {
        fee: 5000,
        err: { InstructionError: [0, 'Custom'] },
        preBalances: [1000000000],
        postBalances: [999995000],
        preTokenBalances: [],
        postTokenBalances: [],
      },
      transaction: {
        message: {
          compiledInstructions: [],
          staticAccountKeys: [],
        },
      },
    });

    const result = await fetcher.fetch('solana', 'mainnet', 'signature123');

    expect(result.status).toBe('failed');
  });

  it('throws when transaction not found', async () => {
    mockGetTransaction.mockResolvedValue(null);

    await expect(
      fetcher.fetch('solana', 'mainnet', 'notfound')
    ).rejects.toThrow('Transaction not found');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/chain-fetcher/svm-fetcher.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Implement SvmChainFetcher**

```typescript
// src/services/transaction-processor/chain-fetcher/svm-fetcher.ts
import { Connection } from '@solana/web3.js';
import type { ChainFetcher, SvmTransactionData, SvmInstruction, SvmTokenBalance } from '../types';

export interface SvmChainFetcherConfig {
  rpcUrls: Record<string, string>;
}

export class SvmChainFetcher implements ChainFetcher {
  private readonly rpcUrls: Record<string, string>;
  private readonly connections: Map<string, Connection> = new Map();

  constructor(config: SvmChainFetcherConfig) {
    this.rpcUrls = config.rpcUrls;
  }

  private getConnection(chain: string): Connection {
    let connection = this.connections.get(chain);
    if (!connection) {
      const rpcUrl = this.rpcUrls[chain];
      if (!rpcUrl) {
        throw new Error(`Unsupported chain: ${chain}`);
      }
      connection = new Connection(rpcUrl);
      this.connections.set(chain, connection);
    }
    return connection;
  }

  async fetch(chain: string, network: string, signature: string): Promise<SvmTransactionData> {
    const connection = this.getConnection(chain);

    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      throw new Error(`Transaction not found: ${signature}`);
    }

    const { meta, transaction, slot, blockTime } = tx;

    const accountKeys = transaction.message.staticAccountKeys.map((k) =>
      typeof k === 'string' ? k : k.toBase58()
    );

    const instructions: SvmInstruction[] = transaction.message.compiledInstructions.map(
      (ix) => ({
        programId: accountKeys[ix.programIdIndex] ?? '',
        accounts: ix.accountKeyIndexes.map((i) => accountKeys[i] ?? ''),
        data: Buffer.from(ix.data).toString('base64'),
      })
    );

    const preTokenBalances: SvmTokenBalance[] = (meta?.preTokenBalances ?? []).map((b) => ({
      accountIndex: b.accountIndex,
      mint: b.mint,
      owner: b.owner ?? '',
      uiTokenAmount: {
        amount: b.uiTokenAmount.amount,
        decimals: b.uiTokenAmount.decimals,
      },
    }));

    const postTokenBalances: SvmTokenBalance[] = (meta?.postTokenBalances ?? []).map((b) => ({
      accountIndex: b.accountIndex,
      mint: b.mint,
      owner: b.owner ?? '',
      uiTokenAmount: {
        amount: b.uiTokenAmount.amount,
        decimals: b.uiTokenAmount.decimals,
      },
    }));

    return {
      type: 'svm',
      signature,
      slot,
      blockTime: blockTime ?? 0,
      fee: meta?.fee ?? 0,
      status: meta?.err === null ? 'success' : 'failed',
      instructions,
      preBalances: meta?.preBalances ?? [],
      postBalances: meta?.postBalances ?? [],
      preTokenBalances,
      postTokenBalances,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/chain-fetcher/svm-fetcher.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/transaction-processor/chain-fetcher/svm-fetcher.ts tests/unit/services/transaction-processor/chain-fetcher/svm-fetcher.test.ts
git commit -m "feat(transaction-processor): add SVM chain fetcher"
```

---

## Task 5: Chain Fetcher Registry

**Files:**
- Create: `src/services/transaction-processor/chain-fetcher/index.ts`
- Test: `tests/unit/services/transaction-processor/chain-fetcher/registry.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/services/transaction-processor/chain-fetcher/registry.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/core/src/services/transaction-processor/chain-fetcher/evm-fetcher', () => ({
  EvmChainFetcher: vi.fn().mockImplementation(() => ({
    fetch: vi.fn().mockResolvedValue({ type: 'evm', hash: '0x123' }),
  })),
}));

vi.mock('@/services/core/src/services/transaction-processor/chain-fetcher/svm-fetcher', () => ({
  SvmChainFetcher: vi.fn().mockImplementation(() => ({
    fetch: vi.fn().mockResolvedValue({ type: 'svm', signature: 'sig123' }),
  })),
}));

import { ChainFetcherRegistry } from '@/services/core/src/services/transaction-processor/chain-fetcher';

describe('ChainFetcherRegistry', () => {
  let registry: ChainFetcherRegistry;

  beforeEach(() => {
    registry = new ChainFetcherRegistry({
      evmRpcUrls: { ethereum: 'https://eth.example.com' },
      svmRpcUrls: { solana: 'https://solana.example.com' },
    });
  });

  it('routes EVM chains to EVM fetcher', async () => {
    const result = await registry.fetch('ethereum', 'mainnet', '0x123');
    expect(result.type).toBe('evm');
  });

  it('routes SVM chains to SVM fetcher', async () => {
    const result = await registry.fetch('solana', 'mainnet', 'sig123');
    expect(result.type).toBe('svm');
  });

  it('throws for unknown chain', async () => {
    await expect(
      registry.fetch('unknown', 'mainnet', 'hash')
    ).rejects.toThrow('No fetcher found for chain');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/chain-fetcher/registry.test.ts`
Expected: FAIL

**Step 3: Implement ChainFetcherRegistry**

```typescript
// src/services/transaction-processor/chain-fetcher/index.ts
import type { ChainFetcher, RawTransaction } from '../types';
import { EvmChainFetcher } from './evm-fetcher';
import { SvmChainFetcher } from './svm-fetcher';

export { EvmChainFetcher } from './evm-fetcher';
export { SvmChainFetcher } from './svm-fetcher';

const EVM_CHAINS = new Set([
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'bsc',
  'fantom',
]);

const SVM_CHAINS = new Set(['solana']);

export interface ChainFetcherRegistryConfig {
  evmRpcUrls: Record<string, string>;
  svmRpcUrls: Record<string, string>;
}

export class ChainFetcherRegistry implements ChainFetcher {
  private readonly evmFetcher: EvmChainFetcher;
  private readonly svmFetcher: SvmChainFetcher;

  constructor(config: ChainFetcherRegistryConfig) {
    this.evmFetcher = new EvmChainFetcher({ rpcUrls: config.evmRpcUrls });
    this.svmFetcher = new SvmChainFetcher({ rpcUrls: config.svmRpcUrls });
  }

  async fetch(chain: string, network: string, txHash: string): Promise<RawTransaction> {
    if (EVM_CHAINS.has(chain)) {
      return this.evmFetcher.fetch(chain, network, txHash);
    }

    if (SVM_CHAINS.has(chain)) {
      return this.svmFetcher.fetch(chain, network, txHash);
    }

    throw new Error(`No fetcher found for chain: ${chain}`);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/chain-fetcher/registry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/transaction-processor/chain-fetcher/index.ts tests/unit/services/transaction-processor/chain-fetcher/registry.test.ts
git commit -m "feat(transaction-processor): add chain fetcher registry"
```

---

## Task 6: EVM Classifier

**Files:**
- Create: `src/services/transaction-processor/classifier/evm-classifier.ts`
- Test: `tests/unit/services/transaction-processor/classifier/evm-classifier.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/services/transaction-processor/classifier/evm-classifier.test.ts
import { describe, it, expect } from 'vitest';
import { EvmClassifier } from '@/services/core/src/services/transaction-processor/classifier/evm-classifier';
import type { EvmTransactionData } from '@/services/core/src/services/transaction-processor/types';

// ERC20 Transfer event topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
// ERC20 Approval event topic
const APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

describe('EvmClassifier', () => {
  const classifier = new EvmClassifier();

  const baseTx: EvmTransactionData = {
    type: 'evm',
    hash: '0xabc123',
    from: '0xsender',
    to: '0xrecipient',
    value: '0',
    input: '0x',
    gasUsed: '21000',
    gasPrice: '20000000000',
    logs: [],
    blockNumber: 12345678,
    blockHash: '0xblockhash',
    timestamp: new Date(),
    status: 'success',
  };

  describe('transfer classification', () => {
    it('classifies native ETH transfer', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        value: '1000000000000000000',
        input: '0x',
      };

      const result = await classifier.classify(tx);

      expect(result.type).toBe('transfer');
      expect(result.confidence).toBe('high');
      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0].type).toBe('native');
    });

    it('classifies ERC20 transfer from Transfer event', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [
          {
            address: '0xtoken',
            topics: [
              TRANSFER_TOPIC,
              '0x000000000000000000000000sender',
              '0x000000000000000000000000recipient',
            ],
            data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
            logIndex: 0,
          },
        ],
      };

      const result = await classifier.classify(tx);

      expect(result.type).toBe('transfer');
      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0].type).toBe('token');
    });
  });

  describe('approve classification', () => {
    it('classifies ERC20 approval', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        input: '0x095ea7b3', // approve(address,uint256)
        logs: [
          {
            address: '0xtoken',
            topics: [
              APPROVAL_TOPIC,
              '0x000000000000000000000000owner',
              '0x000000000000000000000000spender',
            ],
            data: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            logIndex: 0,
          },
        ],
      };

      const result = await classifier.classify(tx);

      expect(result.type).toBe('approve');
      expect(result.confidence).toBe('high');
    });
  });

  describe('mint classification', () => {
    it('classifies mint from zero address transfer', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [
          {
            address: '0xtoken',
            topics: [
              TRANSFER_TOPIC,
              '0x0000000000000000000000000000000000000000000000000000000000000000',
              '0x000000000000000000000000recipient',
            ],
            data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
            logIndex: 0,
          },
        ],
      };

      const result = await classifier.classify(tx);

      expect(result.type).toBe('mint');
    });
  });

  describe('burn classification', () => {
    it('classifies burn to zero address transfer', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [
          {
            address: '0xtoken',
            topics: [
              TRANSFER_TOPIC,
              '0x000000000000000000000000sender',
              '0x0000000000000000000000000000000000000000000000000000000000000000',
            ],
            data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
            logIndex: 0,
          },
        ],
      };

      const result = await classifier.classify(tx);

      expect(result.type).toBe('burn');
    });
  });

  describe('contract deploy classification', () => {
    it('classifies contract deployment', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        to: null,
        input: '0x608060405234801561001057600080fd5b50',
      };

      const result = await classifier.classify(tx);

      expect(result.type).toBe('contract_deploy');
      expect(result.confidence).toBe('high');
    });
  });

  describe('swap classification', () => {
    it('classifies swap with multiple transfers', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        logs: [
          // Transfer in (token A)
          {
            address: '0xtokenA',
            topics: [
              TRANSFER_TOPIC,
              '0x000000000000000000000000sender',
              '0x000000000000000000000000pool',
            ],
            data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
            logIndex: 0,
          },
          // Transfer out (token B)
          {
            address: '0xtokenB',
            topics: [
              TRANSFER_TOPIC,
              '0x000000000000000000000000pool',
              '0x000000000000000000000000sender',
            ],
            data: '0x0000000000000000000000000000000000000000000000001bc16d674ec80000',
            logIndex: 1,
          },
        ],
      };

      const result = await classifier.classify(tx);

      expect(result.type).toBe('swap');
      expect(result.transfers).toHaveLength(2);
    });
  });

  describe('unknown classification', () => {
    it('returns unknown for unrecognized transactions', async () => {
      const tx: EvmTransactionData = {
        ...baseTx,
        input: '0xdeadbeef',
      };

      const result = await classifier.classify(tx);

      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe('low');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/classifier/evm-classifier.test.ts`
Expected: FAIL

**Step 3: Implement EvmClassifier**

```typescript
// src/services/transaction-processor/classifier/evm-classifier.ts
import type {
  Classifier,
  ClassificationResult,
  EvmTransactionData,
  ParsedTransfer,
  RawTransaction,
} from '../types';

// Event topic signatures
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

export class EvmClassifier implements Classifier {
  async classify(tx: RawTransaction): Promise<ClassificationResult> {
    if (tx.type !== 'evm') {
      throw new Error('EvmClassifier can only classify EVM transactions');
    }

    const evmTx = tx as EvmTransactionData;

    // Contract deployment
    if (evmTx.to === null) {
      return {
        type: 'contract_deploy',
        confidence: 'high',
        source: 'custom',
        label: 'Contract Deployment',
        transfers: [],
      };
    }

    // Parse transfers from logs
    const transfers = this.parseTransfers(evmTx);

    // Check for approval
    if (this.isApproval(evmTx)) {
      return {
        type: 'approve',
        confidence: 'high',
        source: 'custom',
        label: 'Token Approval',
        transfers: [],
      };
    }

    // Check for mint (transfer from zero address)
    if (this.isMint(transfers)) {
      return {
        type: 'mint',
        confidence: 'high',
        source: 'custom',
        label: 'Token Mint',
        transfers,
      };
    }

    // Check for burn (transfer to zero address)
    if (this.isBurn(transfers)) {
      return {
        type: 'burn',
        confidence: 'high',
        source: 'custom',
        label: 'Token Burn',
        transfers,
      };
    }

    // Check for swap (multiple transfers with opposite directions)
    if (this.isSwap(transfers, evmTx.from)) {
      return {
        type: 'swap',
        confidence: 'medium',
        source: 'custom',
        label: 'Token Swap',
        transfers,
      };
    }

    // Native ETH transfer
    if (BigInt(evmTx.value) > 0n && evmTx.input === '0x') {
      const nativeTransfer: ParsedTransfer = {
        type: 'native',
        direction: 'out',
        from: evmTx.from,
        to: evmTx.to!,
        amount: evmTx.value,
      };

      return {
        type: 'transfer',
        confidence: 'high',
        source: 'custom',
        label: 'Native Transfer',
        transfers: [nativeTransfer],
      };
    }

    // Simple token transfer
    if (transfers.length === 1) {
      return {
        type: 'transfer',
        confidence: 'high',
        source: 'custom',
        label: 'Token Transfer',
        transfers,
      };
    }

    // Unknown
    return {
      type: 'unknown',
      confidence: 'low',
      source: 'custom',
      label: 'Unknown Transaction',
      transfers,
    };
  }

  private parseTransfers(tx: EvmTransactionData): ParsedTransfer[] {
    const transfers: ParsedTransfer[] = [];

    for (const log of tx.logs) {
      if (log.topics[0] === TRANSFER_TOPIC && log.topics.length >= 3) {
        const from = '0x' + log.topics[1].slice(26);
        const to = '0x' + log.topics[2].slice(26);
        const amount = BigInt(log.data).toString();

        const direction = from.toLowerCase() === tx.from.toLowerCase() ? 'out' : 'in';

        transfers.push({
          type: 'token',
          direction,
          from,
          to,
          amount,
          token: { address: log.address },
        });
      }
    }

    return transfers;
  }

  private isApproval(tx: EvmTransactionData): boolean {
    // Check for approve function selector
    if (tx.input.startsWith('0x095ea7b3')) {
      return true;
    }

    // Check for Approval event
    return tx.logs.some((log) => log.topics[0] === APPROVAL_TOPIC);
  }

  private isMint(transfers: ParsedTransfer[]): boolean {
    return transfers.some(
      (t) => t.from.toLowerCase() === '0x' + ZERO_ADDRESS.slice(26)
    );
  }

  private isBurn(transfers: ParsedTransfer[]): boolean {
    return transfers.some(
      (t) => t.to.toLowerCase() === '0x' + ZERO_ADDRESS.slice(26)
    );
  }

  private isSwap(transfers: ParsedTransfer[], sender: string): boolean {
    if (transfers.length < 2) return false;

    const hasOut = transfers.some(
      (t) => t.direction === 'out' && t.from.toLowerCase() === sender.toLowerCase()
    );
    const hasIn = transfers.some(
      (t) => t.direction === 'in' && t.to.toLowerCase() === sender.toLowerCase()
    );

    return hasOut && hasIn;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/classifier/evm-classifier.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/transaction-processor/classifier/evm-classifier.ts tests/unit/services/transaction-processor/classifier/evm-classifier.test.ts
git commit -m "feat(transaction-processor): add EVM classifier"
```

---

## Task 7: SVM Classifier

**Files:**
- Create: `src/services/transaction-processor/classifier/svm-classifier.ts`
- Test: `tests/unit/services/transaction-processor/classifier/svm-classifier.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/services/transaction-processor/classifier/svm-classifier.test.ts
import { describe, it, expect } from 'vitest';
import { SvmClassifier } from '@/services/core/src/services/transaction-processor/classifier/svm-classifier';
import type { SvmTransactionData } from '@/services/core/src/services/transaction-processor/types';

// Solana program IDs
const SYSTEM_PROGRAM = '11111111111111111111111111111111';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

describe('SvmClassifier', () => {
  const classifier = new SvmClassifier();

  const baseTx: SvmTransactionData = {
    type: 'svm',
    signature: 'sig123',
    slot: 123456789,
    blockTime: 1704067200,
    fee: 5000,
    status: 'success',
    instructions: [],
    preBalances: [1000000000, 0],
    postBalances: [999995000, 5000],
    preTokenBalances: [],
    postTokenBalances: [],
  };

  describe('transfer classification', () => {
    it('classifies native SOL transfer', async () => {
      const tx: SvmTransactionData = {
        ...baseTx,
        instructions: [
          {
            programId: SYSTEM_PROGRAM,
            accounts: ['sender', 'recipient'],
            data: 'AgAAAADh9QUAAAAA', // Transfer instruction
          },
        ],
      };

      const result = await classifier.classify(tx);

      expect(result.type).toBe('transfer');
      expect(result.confidence).toBe('high');
    });

    it('classifies SPL token transfer from balance changes', async () => {
      const tx: SvmTransactionData = {
        ...baseTx,
        instructions: [
          {
            programId: TOKEN_PROGRAM,
            accounts: ['source', 'dest', 'owner'],
            data: 'A0dEpQAAAA==', // Transfer instruction
          },
        ],
        preTokenBalances: [
          {
            accountIndex: 0,
            mint: 'TokenMint111111111111111111111111',
            owner: 'sender',
            uiTokenAmount: { amount: '1000000', decimals: 6 },
          },
        ],
        postTokenBalances: [
          {
            accountIndex: 0,
            mint: 'TokenMint111111111111111111111111',
            owner: 'sender',
            uiTokenAmount: { amount: '900000', decimals: 6 },
          },
        ],
      };

      const result = await classifier.classify(tx);

      expect(result.type).toBe('transfer');
      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0].type).toBe('token');
    });
  });

  describe('swap classification', () => {
    it('classifies swap with multiple token balance changes', async () => {
      const tx: SvmTransactionData = {
        ...baseTx,
        preTokenBalances: [
          {
            accountIndex: 0,
            mint: 'TokenA11111111111111111111111111',
            owner: 'user',
            uiTokenAmount: { amount: '1000000', decimals: 6 },
          },
          {
            accountIndex: 1,
            mint: 'TokenB11111111111111111111111111',
            owner: 'user',
            uiTokenAmount: { amount: '0', decimals: 9 },
          },
        ],
        postTokenBalances: [
          {
            accountIndex: 0,
            mint: 'TokenA11111111111111111111111111',
            owner: 'user',
            uiTokenAmount: { amount: '900000', decimals: 6 },
          },
          {
            accountIndex: 1,
            mint: 'TokenB11111111111111111111111111',
            owner: 'user',
            uiTokenAmount: { amount: '500000000', decimals: 9 },
          },
        ],
      };

      const result = await classifier.classify(tx);

      expect(result.type).toBe('swap');
      expect(result.transfers.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('unknown classification', () => {
    it('returns unknown for unrecognized transactions', async () => {
      const tx: SvmTransactionData = {
        ...baseTx,
        instructions: [
          {
            programId: 'UnknownProgram111111111111111111',
            accounts: [],
            data: '',
          },
        ],
      };

      const result = await classifier.classify(tx);

      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe('low');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/classifier/svm-classifier.test.ts`
Expected: FAIL

**Step 3: Implement SvmClassifier**

```typescript
// src/services/transaction-processor/classifier/svm-classifier.ts
import type {
  Classifier,
  ClassificationResult,
  SvmTransactionData,
  ParsedTransfer,
  RawTransaction,
} from '../types';

// Solana program IDs
const SYSTEM_PROGRAM = '11111111111111111111111111111111';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

export class SvmClassifier implements Classifier {
  async classify(tx: RawTransaction): Promise<ClassificationResult> {
    if (tx.type !== 'svm') {
      throw new Error('SvmClassifier can only classify SVM transactions');
    }

    const svmTx = tx as SvmTransactionData;

    // Parse transfers from token balance changes
    const transfers = this.parseTransfers(svmTx);

    // Check for swap (both increases and decreases in different tokens)
    if (this.isSwap(transfers)) {
      return {
        type: 'swap',
        confidence: 'medium',
        source: 'custom',
        label: 'Token Swap',
        transfers,
      };
    }

    // Check for native SOL transfer
    if (this.isNativeTransfer(svmTx)) {
      const nativeTransfers = this.parseNativeTransfers(svmTx);
      return {
        type: 'transfer',
        confidence: 'high',
        source: 'custom',
        label: 'Native Transfer',
        transfers: nativeTransfers,
      };
    }

    // Simple token transfer
    if (transfers.length > 0) {
      return {
        type: 'transfer',
        confidence: 'high',
        source: 'custom',
        label: 'Token Transfer',
        transfers,
      };
    }

    // Unknown
    return {
      type: 'unknown',
      confidence: 'low',
      source: 'custom',
      label: 'Unknown Transaction',
      transfers: [],
    };
  }

  private parseTransfers(tx: SvmTransactionData): ParsedTransfer[] {
    const transfers: ParsedTransfer[] = [];
    const preMap = new Map<string, { amount: string; decimals: number; owner: string }>();

    // Build pre-balance map by mint + owner
    for (const bal of tx.preTokenBalances) {
      const key = `${bal.mint}:${bal.owner}`;
      preMap.set(key, {
        amount: bal.uiTokenAmount.amount,
        decimals: bal.uiTokenAmount.decimals,
        owner: bal.owner,
      });
    }

    // Compare with post-balances
    for (const postBal of tx.postTokenBalances) {
      const key = `${postBal.mint}:${postBal.owner}`;
      const preBal = preMap.get(key);

      const preAmount = BigInt(preBal?.amount ?? '0');
      const postAmount = BigInt(postBal.uiTokenAmount.amount);
      const diff = postAmount - preAmount;

      if (diff !== 0n) {
        transfers.push({
          type: 'token',
          direction: diff > 0n ? 'in' : 'out',
          from: diff < 0n ? postBal.owner : '',
          to: diff > 0n ? postBal.owner : '',
          amount: (diff > 0n ? diff : -diff).toString(),
          token: {
            address: postBal.mint,
            decimals: postBal.uiTokenAmount.decimals,
          },
        });
      }
    }

    return transfers;
  }

  private parseNativeTransfers(tx: SvmTransactionData): ParsedTransfer[] {
    const transfers: ParsedTransfer[] = [];

    for (let i = 0; i < tx.preBalances.length; i++) {
      const diff = tx.postBalances[i] - tx.preBalances[i];
      if (diff !== 0 && Math.abs(diff) !== tx.fee) {
        transfers.push({
          type: 'native',
          direction: diff > 0 ? 'in' : 'out',
          from: '',
          to: '',
          amount: Math.abs(diff).toString(),
        });
      }
    }

    return transfers;
  }

  private isNativeTransfer(tx: SvmTransactionData): boolean {
    return tx.instructions.some((ix) => ix.programId === SYSTEM_PROGRAM);
  }

  private isSwap(transfers: ParsedTransfer[]): boolean {
    if (transfers.length < 2) return false;

    const hasIn = transfers.some((t) => t.direction === 'in');
    const hasOut = transfers.some((t) => t.direction === 'out');

    // Different tokens
    const mints = new Set(transfers.map((t) => t.token?.address).filter(Boolean));

    return hasIn && hasOut && mints.size >= 2;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/classifier/svm-classifier.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/transaction-processor/classifier/svm-classifier.ts tests/unit/services/transaction-processor/classifier/svm-classifier.test.ts
git commit -m "feat(transaction-processor): add SVM classifier"
```

---

## Task 8: Noves Classifier Adapter

**Files:**
- Create: `src/services/transaction-processor/classifier/noves-classifier.ts`
- Test: `tests/unit/services/transaction-processor/classifier/noves-classifier.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/services/transaction-processor/classifier/noves-classifier.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetTransaction = vi.fn();

vi.mock('@noves/noves-sdk', () => ({
  Translate: {
    evm: vi.fn().mockReturnValue({
      getTransaction: mockGetTransaction,
    }),
  },
}));

import { NovesClassifier } from '@/services/core/src/services/transaction-processor/classifier/noves-classifier';
import type { EvmTransactionData } from '@/services/core/src/services/transaction-processor/types';

describe('NovesClassifier', () => {
  let classifier: NovesClassifier;

  beforeEach(() => {
    vi.clearAllMocks();
    classifier = new NovesClassifier({ apiKey: 'test-key' });
  });

  const baseTx: EvmTransactionData = {
    type: 'evm',
    hash: '0xabc123',
    from: '0xsender',
    to: '0xrecipient',
    value: '0',
    input: '0x',
    gasUsed: '21000',
    gasPrice: '20000000000',
    logs: [],
    blockNumber: 12345678,
    blockHash: '0xblockhash',
    timestamp: new Date(),
    status: 'success',
  };

  it('maps Noves classification to our format', async () => {
    mockGetTransaction.mockResolvedValue({
      classificationData: {
        type: 'swap',
        description: 'Swapped 1 ETH for 2000 USDC on Uniswap',
      },
      transfers: [
        {
          action: 'sent',
          from: { address: '0xsender' },
          to: { address: '0xpool' },
          amount: '1000000000000000000',
          token: { address: '0x0', symbol: 'ETH', decimals: 18 },
        },
        {
          action: 'received',
          from: { address: '0xpool' },
          to: { address: '0xsender' },
          amount: '2000000000',
          token: { address: '0xusdc', symbol: 'USDC', decimals: 6 },
        },
      ],
    });

    const result = await classifier.classify(baseTx);

    expect(result.type).toBe('swap');
    expect(result.source).toBe('noves');
    expect(result.label).toBe('Swapped 1 ETH for 2000 USDC on Uniswap');
    expect(result.transfers).toHaveLength(2);
  });

  it('returns unknown when Noves returns no classification', async () => {
    mockGetTransaction.mockResolvedValue({
      classificationData: {
        type: 'unknown',
        description: 'Unknown transaction',
      },
      transfers: [],
    });

    const result = await classifier.classify(baseTx);

    expect(result.type).toBe('unknown');
    expect(result.confidence).toBe('low');
  });

  it('handles Noves API errors gracefully', async () => {
    mockGetTransaction.mockRejectedValue(new Error('API error'));

    const result = await classifier.classify(baseTx);

    expect(result.type).toBe('unknown');
    expect(result.confidence).toBe('low');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/classifier/noves-classifier.test.ts`
Expected: FAIL

**Step 3: Implement NovesClassifier**

```typescript
// src/services/transaction-processor/classifier/noves-classifier.ts
import { Translate } from '@noves/noves-sdk';
import type {
  Classifier,
  ClassificationResult,
  ClassificationType,
  ParsedTransfer,
  RawTransaction,
  EvmTransactionData,
} from '../types';

// Map Noves types to our classification types
const NOVES_TYPE_MAP: Record<string, ClassificationType> = {
  swap: 'swap',
  bridge: 'bridge',
  stake: 'stake',
  unstake: 'stake',
  mint: 'mint',
  burn: 'burn',
  approve: 'approve',
  transfer: 'transfer',
  receive: 'transfer',
  send: 'transfer',
  deploy: 'contract_deploy',
  nft_transfer: 'nft_transfer',
  nft_mint: 'mint',
  unknown: 'unknown',
};

export interface NovesClassifierConfig {
  apiKey: string;
}

export class NovesClassifier implements Classifier {
  private readonly evmClient: ReturnType<typeof Translate.evm>;

  constructor(config: NovesClassifierConfig) {
    this.evmClient = Translate.evm(config.apiKey);
  }

  async classify(tx: RawTransaction): Promise<ClassificationResult> {
    if (tx.type !== 'evm') {
      return this.unknownResult();
    }

    const evmTx = tx as EvmTransactionData;

    try {
      const novesTx = await this.evmClient.getTransaction('eth', evmTx.hash);

      if (!novesTx || !novesTx.classificationData) {
        return this.unknownResult();
      }

      const type = NOVES_TYPE_MAP[novesTx.classificationData.type] ?? 'unknown';
      const transfers = this.parseTransfers(novesTx.transfers ?? []);

      return {
        type,
        confidence: type === 'unknown' ? 'low' : 'high',
        source: 'noves',
        label: novesTx.classificationData.description ?? 'Unknown',
        transfers,
      };
    } catch {
      return this.unknownResult();
    }
  }

  private parseTransfers(novesTransfers: any[]): ParsedTransfer[] {
    return novesTransfers.map((t) => ({
      type: t.nft ? 'nft' : t.token?.address === '0x0' ? 'native' : 'token',
      direction: t.action === 'received' ? 'in' : 'out',
      from: t.from?.address ?? '',
      to: t.to?.address ?? '',
      amount: t.amount ?? '0',
      token: t.token
        ? {
            address: t.token.address,
            symbol: t.token.symbol,
            decimals: t.token.decimals,
          }
        : undefined,
    }));
  }

  private unknownResult(): ClassificationResult {
    return {
      type: 'unknown',
      confidence: 'low',
      source: 'noves',
      label: 'Unknown Transaction',
      transfers: [],
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/classifier/noves-classifier.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/transaction-processor/classifier/noves-classifier.ts tests/unit/services/transaction-processor/classifier/noves-classifier.test.ts
git commit -m "feat(transaction-processor): add Noves classifier adapter"
```

---

## Task 9: Classifier Registry with Fallback

**Files:**
- Create: `src/services/transaction-processor/classifier/index.ts`
- Test: `tests/unit/services/transaction-processor/classifier/registry.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/services/transaction-processor/classifier/registry.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Classifier, ClassificationResult, RawTransaction } from '@/services/core/src/services/transaction-processor/types';

// Create mock classifiers
const mockEvmClassifier: Classifier = {
  classify: vi.fn(),
};

const mockSvmClassifier: Classifier = {
  classify: vi.fn(),
};

const mockNovesClassifier: Classifier = {
  classify: vi.fn(),
};

vi.mock('@/services/core/src/services/transaction-processor/classifier/evm-classifier', () => ({
  EvmClassifier: vi.fn().mockImplementation(() => mockEvmClassifier),
}));

vi.mock('@/services/core/src/services/transaction-processor/classifier/svm-classifier', () => ({
  SvmClassifier: vi.fn().mockImplementation(() => mockSvmClassifier),
}));

vi.mock('@/services/core/src/services/transaction-processor/classifier/noves-classifier', () => ({
  NovesClassifier: vi.fn().mockImplementation(() => mockNovesClassifier),
}));

import { ClassifierRegistry } from '@/services/core/src/services/transaction-processor/classifier';

describe('ClassifierRegistry', () => {
  let registry: ClassifierRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ClassifierRegistry({ novesApiKey: 'test-key' });
  });

  const evmTx: RawTransaction = {
    type: 'evm',
    hash: '0x123',
    from: '0xsender',
    to: '0xrecipient',
    value: '0',
    input: '0x',
    gasUsed: '21000',
    gasPrice: '20000000000',
    logs: [],
    blockNumber: 12345678,
    blockHash: '0xblockhash',
    timestamp: new Date(),
    status: 'success',
  };

  it('uses custom classifier result when confident', async () => {
    (mockEvmClassifier.classify as vi.Mock).mockResolvedValue({
      type: 'transfer',
      confidence: 'high',
      source: 'custom',
      label: 'Token Transfer',
      transfers: [],
    });

    const result = await registry.classify(evmTx);

    expect(result.type).toBe('transfer');
    expect(result.source).toBe('custom');
    expect(mockNovesClassifier.classify).not.toHaveBeenCalled();
  });

  it('falls back to Noves when custom returns unknown', async () => {
    (mockEvmClassifier.classify as vi.Mock).mockResolvedValue({
      type: 'unknown',
      confidence: 'low',
      source: 'custom',
      label: 'Unknown',
      transfers: [],
    });

    (mockNovesClassifier.classify as vi.Mock).mockResolvedValue({
      type: 'swap',
      confidence: 'high',
      source: 'noves',
      label: 'Swap on Uniswap',
      transfers: [],
    });

    const result = await registry.classify(evmTx);

    expect(result.type).toBe('swap');
    expect(result.source).toBe('noves');
  });

  it('falls back to Noves when custom has low confidence', async () => {
    (mockEvmClassifier.classify as vi.Mock).mockResolvedValue({
      type: 'transfer',
      confidence: 'low',
      source: 'custom',
      label: 'Maybe Transfer',
      transfers: [],
    });

    (mockNovesClassifier.classify as vi.Mock).mockResolvedValue({
      type: 'bridge',
      confidence: 'high',
      source: 'noves',
      label: 'Bridge Transaction',
      transfers: [],
    });

    const result = await registry.classify(evmTx);

    expect(result.type).toBe('bridge');
    expect(result.source).toBe('noves');
  });

  it('keeps custom result if Noves also returns unknown', async () => {
    (mockEvmClassifier.classify as vi.Mock).mockResolvedValue({
      type: 'unknown',
      confidence: 'low',
      source: 'custom',
      label: 'Unknown',
      transfers: [{ type: 'token', direction: 'out', from: '', to: '', amount: '100' }],
    });

    (mockNovesClassifier.classify as vi.Mock).mockResolvedValue({
      type: 'unknown',
      confidence: 'low',
      source: 'noves',
      label: 'Unknown',
      transfers: [],
    });

    const result = await registry.classify(evmTx);

    expect(result.type).toBe('unknown');
    // Should keep custom transfers
    expect(result.transfers).toHaveLength(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/classifier/registry.test.ts`
Expected: FAIL

**Step 3: Implement ClassifierRegistry**

```typescript
// src/services/transaction-processor/classifier/index.ts
import type { Classifier, ClassificationResult, RawTransaction } from '../types';
import { EvmClassifier } from './evm-classifier';
import { SvmClassifier } from './svm-classifier';
import { NovesClassifier } from './noves-classifier';

export { EvmClassifier } from './evm-classifier';
export { SvmClassifier } from './svm-classifier';
export { NovesClassifier } from './noves-classifier';

export interface ClassifierRegistryConfig {
  novesApiKey?: string;
}

export class ClassifierRegistry implements Classifier {
  private readonly evmClassifier: EvmClassifier;
  private readonly svmClassifier: SvmClassifier;
  private readonly novesClassifier?: NovesClassifier;

  constructor(config: ClassifierRegistryConfig) {
    this.evmClassifier = new EvmClassifier();
    this.svmClassifier = new SvmClassifier();

    if (config.novesApiKey) {
      this.novesClassifier = new NovesClassifier({ apiKey: config.novesApiKey });
    }
  }

  async classify(tx: RawTransaction): Promise<ClassificationResult> {
    // Get custom classification
    const customResult = await this.classifyWithCustom(tx);

    // If confident and not unknown, use custom result
    if (customResult.type !== 'unknown' && customResult.confidence !== 'low') {
      return customResult;
    }

    // Try Noves fallback
    if (this.novesClassifier && tx.type === 'evm') {
      const novesResult = await this.novesClassifier.classify(tx);

      // Use Noves if it provides a better classification
      if (novesResult.type !== 'unknown') {
        return novesResult;
      }
    }

    // Return custom result (may include parsed transfers even if unknown)
    return customResult;
  }

  private async classifyWithCustom(tx: RawTransaction): Promise<ClassificationResult> {
    switch (tx.type) {
      case 'evm':
        return this.evmClassifier.classify(tx);
      case 'svm':
        return this.svmClassifier.classify(tx);
      default:
        return {
          type: 'unknown',
          confidence: 'low',
          source: 'custom',
          label: 'Unknown Transaction',
          transfers: [],
        };
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/classifier/registry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/transaction-processor/classifier/index.ts tests/unit/services/transaction-processor/classifier/registry.test.ts
git commit -m "feat(transaction-processor): add classifier registry with fallback"
```

---

## Task 10: Transaction Upserter

**Files:**
- Create: `src/services/transaction-processor/upserter.ts`
- Test: `tests/unit/services/transaction-processor/upserter.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/services/transaction-processor/upserter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Kysely } from 'kysely';
import type { Database } from '@/services/core/src/lib/database';

const mockExecute = vi.fn();
const mockTransaction = vi.fn();

const mockDb = {
  transaction: () => ({
    execute: mockTransaction,
  }),
  insertInto: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflict: vi.fn().mockReturnThis(),
  doUpdateSet: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  returningAll: vi.fn().mockReturnThis(),
  executeTakeFirstOrThrow: mockExecute,
} as unknown as Kysely<Database>;

import { TransactionUpserter } from '@/services/core/src/services/transaction-processor/upserter';
import type {
  NormalizedTransaction,
  ClassificationResult,
  TokenInfo,
} from '@/services/core/src/services/transaction-processor/types';

describe('TransactionUpserter', () => {
  let upserter: TransactionUpserter;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTransaction.mockImplementation(async (fn) => {
      return fn({
        insertInto: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        onConflict: vi.fn().mockReturnValue({
          columns: vi.fn().mockReturnValue({
            doUpdateSet: vi.fn().mockReturnThis(),
          }),
        }),
        returningAll: vi.fn().mockReturnValue({
          executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
            id: 'tx-123',
            chain: 'ethereum',
            network: 'mainnet',
          }),
        }),
      });
    });

    upserter = new TransactionUpserter(mockDb);
  });

  const normalizedTx: NormalizedTransaction = {
    chain: 'ethereum',
    network: 'mainnet',
    txHash: '0xabc123',
    blockNumber: '12345678',
    blockHash: '0xblockhash',
    timestamp: new Date('2024-01-01'),
    from: '0xsender',
    to: '0xrecipient',
    value: '1000000000000000000',
    fee: '21000000000000',
    status: 'success',
  };

  const classification: ClassificationResult = {
    type: 'transfer',
    confidence: 'high',
    source: 'custom',
    label: 'Token Transfer',
    transfers: [
      {
        type: 'token',
        direction: 'out',
        from: '0xsender',
        to: '0xrecipient',
        amount: '1000000',
        token: { address: '0xtoken', symbol: 'TEST', decimals: 18 },
      },
    ],
  };

  const tokens: TokenInfo[] = [
    { address: '0xtoken', symbol: 'TEST', name: 'Test Token', decimals: 18 },
  ];

  it('upserts transaction with classification', async () => {
    const result = await upserter.upsert(normalizedTx, classification, tokens);

    expect(result.transactionId).toBe('tx-123');
    expect(result.classificationType).toBe('transfer');
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('reports tokens upserted count', async () => {
    const result = await upserter.upsert(normalizedTx, classification, tokens);

    expect(result.tokensDiscovered).toBe(1);
    expect(result.tokensUpserted).toBe(1);
  });

  it('handles transactions with no tokens', async () => {
    const nativeClassification: ClassificationResult = {
      type: 'transfer',
      confidence: 'high',
      source: 'custom',
      label: 'Native Transfer',
      transfers: [
        {
          type: 'native',
          direction: 'out',
          from: '0xsender',
          to: '0xrecipient',
          amount: '1000000000000000000',
        },
      ],
    };

    const result = await upserter.upsert(normalizedTx, nativeClassification, []);

    expect(result.tokensDiscovered).toBe(0);
    expect(result.tokensUpserted).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/upserter.test.ts`
Expected: FAIL

**Step 3: Implement TransactionUpserter**

```typescript
// src/services/transaction-processor/upserter.ts
import type { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '@/services/core/src/lib/database';
import type {
  TransactionUpserter as ITransactionUpserter,
  NormalizedTransaction,
  ClassificationResult,
  ProcessResult,
  TokenInfo,
  ParsedTransfer,
} from './types';

export class TransactionUpserter implements ITransactionUpserter {
  constructor(private readonly db: Kysely<Database>) {}

  async upsert(
    normalized: NormalizedTransaction,
    classification: ClassificationResult,
    tokens: TokenInfo[]
  ): Promise<ProcessResult> {
    const tokensDiscovered = tokens.length;
    let tokensUpserted = 0;

    const result = await this.db.transaction().execute(async (trx) => {
      // 1. Upsert tokens
      for (const token of tokens) {
        await this.upsertToken(trx, normalized.chain, normalized.network, token);
        tokensUpserted++;
      }

      // 2. Upsert transaction
      const txResult = await this.upsertTransaction(trx, normalized, classification);

      // 3. Upsert transfers
      await this.upsertTransfers(
        trx,
        txResult.id,
        normalized.chain,
        normalized.network,
        classification.transfers
      );

      return txResult;
    });

    return {
      transactionId: result.id,
      classificationType: classification.type,
      tokensDiscovered,
      tokensUpserted,
    };
  }

  private async upsertToken(
    trx: Kysely<Database>,
    chain: string,
    network: string,
    token: TokenInfo
  ): Promise<void> {
    const now = new Date().toISOString();

    await trx
      .insertInto('tokens')
      .values({
        id: uuidv4(),
        chain,
        network,
        address: token.address.toLowerCase(),
        name: token.name ?? 'Unknown',
        symbol: token.symbol ?? 'UNKNOWN',
        decimals: token.decimals ?? 18,
        logo_uri: null,
        coingecko_id: null,
        is_verified: false,
        is_spam: false,
        created_at: now,
        updated_at: now,
      })
      .onConflict((oc) =>
        oc.columns(['chain', 'network', 'address']).doUpdateSet({
          name: token.name ?? 'Unknown',
          symbol: token.symbol ?? 'UNKNOWN',
          decimals: token.decimals ?? 18,
          updated_at: now,
        })
      )
      .execute();
  }

  private async upsertTransaction(
    trx: Kysely<Database>,
    normalized: NormalizedTransaction,
    classification: ClassificationResult
  ): Promise<{ id: string }> {
    const now = new Date().toISOString();
    const id = uuidv4();

    const result = await trx
      .insertInto('transactions')
      .values({
        id,
        chain: normalized.chain,
        network: normalized.network,
        tx_hash: normalized.txHash.toLowerCase(),
        block_number: normalized.blockNumber,
        block_hash: normalized.blockHash,
        tx_index: null,
        from_address: normalized.from.toLowerCase(),
        to_address: normalized.to?.toLowerCase() ?? null,
        value: normalized.value,
        fee: normalized.fee,
        status: normalized.status,
        timestamp: normalized.timestamp.toISOString(),
        classification_type: classification.type,
        classification_label: classification.label,
        protocol_name: classification.protocol ?? null,
        details: null,
        created_at: now,
        updated_at: now,
      })
      .onConflict((oc) =>
        oc.columns(['chain', 'network', 'tx_hash']).doUpdateSet({
          classification_type: classification.type,
          classification_label: classification.label,
          protocol_name: classification.protocol ?? null,
          updated_at: now,
        })
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return { id: result.id };
  }

  private async upsertTransfers(
    trx: Kysely<Database>,
    txId: string,
    chain: string,
    network: string,
    transfers: ParsedTransfer[]
  ): Promise<void> {
    const now = new Date().toISOString();

    for (const transfer of transfers) {
      if (transfer.type === 'native') {
        await trx
          .insertInto('native_transfers')
          .values({
            id: uuidv4(),
            tx_id: txId,
            chain,
            network,
            from_address: transfer.from.toLowerCase() || null,
            to_address: transfer.to.toLowerCase() || null,
            amount: transfer.amount,
            metadata: null,
            created_at: now,
          })
          .execute();
      } else if (transfer.type === 'token' && transfer.token) {
        await trx
          .insertInto('token_transfers')
          .values({
            id: uuidv4(),
            tx_id: txId,
            chain,
            network,
            token_address: transfer.token.address.toLowerCase(),
            from_address: transfer.from.toLowerCase() || null,
            to_address: transfer.to.toLowerCase() || null,
            amount: transfer.amount,
            transfer_type: transfer.direction,
            metadata: null,
            created_at: now,
          })
          .execute();
      }
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/upserter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/transaction-processor/upserter.ts tests/unit/services/transaction-processor/upserter.test.ts
git commit -m "feat(transaction-processor): add transaction upserter"
```

---

## Task 11: TransactionProcessor Orchestrator

**Files:**
- Create: `src/services/transaction-processor/index.ts`
- Test: `tests/unit/services/transaction-processor/processor.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/services/transaction-processor/processor.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
const mockClassify = vi.fn();
const mockUpsert = vi.fn();
const mockFetchToken = vi.fn();

vi.mock('@/services/core/src/services/transaction-processor/chain-fetcher', () => ({
  ChainFetcherRegistry: vi.fn().mockImplementation(() => ({
    fetch: mockFetch,
  })),
}));

vi.mock('@/services/core/src/services/transaction-processor/classifier', () => ({
  ClassifierRegistry: vi.fn().mockImplementation(() => ({
    classify: mockClassify,
  })),
}));

vi.mock('@/services/core/src/services/transaction-processor/upserter', () => ({
  TransactionUpserter: vi.fn().mockImplementation(() => ({
    upsert: mockUpsert,
  })),
}));

vi.mock('@/services/core/src/services/transaction-processor/token-metadata-fetcher', () => ({
  TokenMetadataFetcher: vi.fn().mockImplementation(() => ({
    fetch: mockFetchToken,
  })),
}));

import { TransactionProcessor } from '@/services/core/src/services/transaction-processor';

describe('TransactionProcessor', () => {
  let processor: TransactionProcessor;

  beforeEach(() => {
    vi.clearAllMocks();

    processor = new TransactionProcessor({
      evmRpcUrls: { ethereum: 'https://eth.example.com' },
      svmRpcUrls: { solana: 'https://solana.example.com' },
      novesApiKey: 'test-key',
      coinGeckoApiUrl: 'https://api.coingecko.com/api/v3',
      db: {} as any,
    });

    mockFetch.mockResolvedValue({
      type: 'evm',
      hash: '0x123',
      from: '0xsender',
      to: '0xrecipient',
      value: '1000000000000000000',
      input: '0x',
      gasUsed: '21000',
      gasPrice: '20000000000',
      logs: [],
      blockNumber: 12345678,
      blockHash: '0xblockhash',
      timestamp: new Date(),
      status: 'success',
    });

    mockClassify.mockResolvedValue({
      type: 'transfer',
      confidence: 'high',
      source: 'custom',
      label: 'Native Transfer',
      transfers: [],
    });

    mockUpsert.mockResolvedValue({
      transactionId: 'tx-123',
      classificationType: 'transfer',
      tokensDiscovered: 0,
      tokensUpserted: 0,
    });
  });

  it('processes a transaction end-to-end', async () => {
    const result = await processor.process('ethereum', '0x123');

    expect(mockFetch).toHaveBeenCalledWith('ethereum', 'mainnet', '0x123');
    expect(mockClassify).toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalled();
    expect(result.transactionId).toBe('tx-123');
  });

  it('fetches metadata for discovered tokens', async () => {
    mockClassify.mockResolvedValue({
      type: 'transfer',
      confidence: 'high',
      source: 'custom',
      label: 'Token Transfer',
      transfers: [
        {
          type: 'token',
          direction: 'out',
          from: '0xsender',
          to: '0xrecipient',
          amount: '1000000',
          token: { address: '0xtoken' },
        },
      ],
    });

    mockFetchToken.mockResolvedValue({
      address: '0xtoken',
      name: 'Test Token',
      symbol: 'TEST',
      decimals: 18,
    });

    await processor.process('ethereum', '0x123');

    expect(mockFetchToken).toHaveBeenCalledWith('ethereum', 'mainnet', '0xtoken');
  });

  it('continues processing even if token fetch fails', async () => {
    mockClassify.mockResolvedValue({
      type: 'transfer',
      confidence: 'high',
      source: 'custom',
      label: 'Token Transfer',
      transfers: [
        {
          type: 'token',
          direction: 'out',
          from: '0xsender',
          to: '0xrecipient',
          amount: '1000000',
          token: { address: '0xtoken' },
        },
      ],
    });

    mockFetchToken.mockRejectedValue(new Error('API error'));

    const result = await processor.process('ethereum', '0x123');

    expect(result.transactionId).toBe('tx-123');
  });

  it('throws when transaction not found', async () => {
    mockFetch.mockRejectedValue(new Error('Transaction not found'));

    await expect(processor.process('ethereum', '0xnotfound')).rejects.toThrow(
      'Transaction not found'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/processor.test.ts`
Expected: FAIL

**Step 3: Implement TransactionProcessor**

```typescript
// src/services/transaction-processor/index.ts
import type { Kysely } from 'kysely';
import type { Database } from '@/services/core/src/lib/database';
import { resolveChainNetwork } from '../transactions/chain-resolver';
import { ChainFetcherRegistry } from './chain-fetcher';
import { ClassifierRegistry } from './classifier';
import { TransactionUpserter } from './upserter';
import { TokenMetadataFetcher, type TokenMetadataResult } from './token-metadata-fetcher';
import type {
  ProcessResult,
  NormalizedTransaction,
  RawTransaction,
  EvmTransactionData,
  SvmTransactionData,
  TokenInfo,
} from './types';

export * from './types';
export { ChainFetcherRegistry } from './chain-fetcher';
export { ClassifierRegistry } from './classifier';
export { TransactionUpserter } from './upserter';
export { TokenMetadataFetcher } from './token-metadata-fetcher';

export interface TransactionProcessorConfig {
  evmRpcUrls: Record<string, string>;
  svmRpcUrls: Record<string, string>;
  novesApiKey?: string;
  coinGeckoApiUrl: string;
  coinGeckoApiKey?: string;
  db: Kysely<Database>;
}

export class TransactionProcessor {
  private readonly fetcher: ChainFetcherRegistry;
  private readonly classifier: ClassifierRegistry;
  private readonly upserter: TransactionUpserter;
  private readonly tokenFetcher: TokenMetadataFetcher;

  constructor(config: TransactionProcessorConfig) {
    this.fetcher = new ChainFetcherRegistry({
      evmRpcUrls: config.evmRpcUrls,
      svmRpcUrls: config.svmRpcUrls,
    });

    this.classifier = new ClassifierRegistry({
      novesApiKey: config.novesApiKey,
    });

    this.upserter = new TransactionUpserter(config.db);

    this.tokenFetcher = new TokenMetadataFetcher({
      coinGeckoApiUrl: config.coinGeckoApiUrl,
      coinGeckoApiKey: config.coinGeckoApiKey,
    });
  }

  async process(chainAlias: string, txHash: string): Promise<ProcessResult> {
    // 1. Resolve chain alias
    const { chain, network } = await resolveChainNetwork(chainAlias);

    // 2. Fetch raw transaction
    const rawTx = await this.fetcher.fetch(chain, network, txHash);

    // 3. Classify transaction
    const classification = await this.classifier.classify(rawTx);

    // 4. Resolve token metadata (soft fail)
    const tokens = await this.resolveTokens(chain, network, classification.transfers);

    // 5. Normalize transaction
    const normalized = this.normalize(chain, network, rawTx);

    // 6. Upsert to database
    return this.upserter.upsert(normalized, classification, tokens);
  }

  private async resolveTokens(
    chain: string,
    network: string,
    transfers: Array<{ type: string; token?: { address: string } }>
  ): Promise<TokenInfo[]> {
    const tokenAddresses = transfers
      .filter((t) => t.type === 'token' && t.token?.address)
      .map((t) => t.token!.address);

    const uniqueAddresses = [...new Set(tokenAddresses)];
    const tokens: TokenInfo[] = [];

    for (const address of uniqueAddresses) {
      try {
        const metadata = await this.tokenFetcher.fetch(chain, network, address);
        tokens.push({
          address: metadata.address,
          name: metadata.name,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
        });
      } catch {
        // Continue without metadata for this token
        tokens.push({ address: address.toLowerCase() });
      }
    }

    return tokens;
  }

  private normalize(chain: string, network: string, rawTx: RawTransaction): NormalizedTransaction {
    if (rawTx.type === 'evm') {
      const evmTx = rawTx as EvmTransactionData;
      return {
        chain,
        network,
        txHash: evmTx.hash,
        blockNumber: evmTx.blockNumber.toString(),
        blockHash: evmTx.blockHash,
        timestamp: evmTx.timestamp,
        from: evmTx.from,
        to: evmTx.to,
        value: evmTx.value,
        fee: (BigInt(evmTx.gasUsed) * BigInt(evmTx.gasPrice)).toString(),
        status: evmTx.status,
      };
    }

    if (rawTx.type === 'svm') {
      const svmTx = rawTx as SvmTransactionData;
      return {
        chain,
        network,
        txHash: svmTx.signature,
        blockNumber: svmTx.slot.toString(),
        blockHash: '',
        timestamp: new Date(svmTx.blockTime * 1000),
        from: '',
        to: null,
        value: '0',
        fee: svmTx.fee.toString(),
        status: svmTx.status,
      };
    }

    throw new Error(`Unknown transaction type`);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/services/transaction-processor/processor.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/transaction-processor/index.ts tests/unit/services/transaction-processor/processor.test.ts
git commit -m "feat(transaction-processor): add TransactionProcessor orchestrator"
```

---

## Task 12: Integration with Reconciliation Worker

**Files:**
- Modify: `src/services/reconciliation/reconciliation-worker.ts`
- Test: `tests/unit/services/reconciliation/reconciliation-worker-integration.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/services/reconciliation/reconciliation-worker-integration.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProcess = vi.fn();

vi.mock('@/services/core/src/services/transaction-processor', () => ({
  TransactionProcessor: vi.fn().mockImplementation(() => ({
    process: mockProcess,
  })),
}));

// Re-use existing mocks from reconciliation-worker.test.ts pattern
const mockJobRepository = {
  claimNextPendingJob: vi.fn(),
  update: vi.fn(),
  addAuditEntry: vi.fn(),
};

const mockTransactionRepository = {
  findByChainAndAddress: vi.fn(),
};

const mockProviderFetchTransactions = vi.fn();

vi.mock('@/services/core/src/services/reconciliation/providers/registry', () => ({
  getProviderForChain: vi.fn().mockReturnValue({
    fetchTransactions: mockProviderFetchTransactions,
  }),
}));

import { ReconciliationWorker } from '@/services/core/src/services/reconciliation/reconciliation-worker';

describe('ReconciliationWorker with TransactionProcessor', () => {
  let worker: ReconciliationWorker;

  beforeEach(() => {
    vi.clearAllMocks();

    worker = new ReconciliationWorker({
      jobRepository: mockJobRepository as any,
      transactionRepository: mockTransactionRepository as any,
      transactionProcessor: { process: mockProcess } as any,
    });

    mockTransactionRepository.findByChainAndAddress.mockResolvedValue({
      data: [],
      hasMore: false,
    });
  });

  it('uses TransactionProcessor when processing new transactions', async () => {
    const job = {
      id: 'job-1',
      address: '0xaddress',
      chain: 'ethereum',
      network: 'mainnet',
      provider: 'noves',
      status: 'processing',
      processedCount: 0,
      transactionsAdded: 0,
      transactionsSoftDeleted: 0,
      discrepanciesFlagged: 0,
      errorsCount: 0,
      lastProcessedCursor: null,
      createdAt: new Date(),
    };

    mockProviderFetchTransactions.mockImplementation(async function* () {
      yield {
        transactionHash: '0xnewtx',
        chain: 'ethereum',
        network: 'mainnet',
        timestamp: new Date(),
        cursor: 'cursor1',
        rawData: {},
        normalized: {
          fromAddress: '0xsender',
          toAddress: '0xrecipient',
          blockNumber: '12345',
          fee: '21000',
        },
      };
    });

    mockProcess.mockResolvedValue({
      transactionId: 'tx-123',
      classificationType: 'transfer',
      tokensDiscovered: 1,
      tokensUpserted: 1,
    });

    await worker.processJob(job);

    expect(mockProcess).toHaveBeenCalledWith('ethereum', '0xnewtx');
    expect(mockJobRepository.addAuditEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-1',
        transactionHash: '0xnewtx',
        action: 'added',
      })
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/services/reconciliation/reconciliation-worker-integration.test.ts`
Expected: FAIL

**Step 3: Modify ReconciliationWorker to use TransactionProcessor**

Add `transactionProcessor` to deps and call it when processing new transactions:

```typescript
// In src/services/reconciliation/reconciliation-worker.ts
// Add to imports:
import type { TransactionProcessor, ProcessResult } from '../transaction-processor';

// Update ReconciliationWorkerDeps interface:
export interface ReconciliationWorkerDeps {
  jobRepository: ReconciliationJobRepository;
  transactionRepository: TransactionRepository;
  transactionProcessor?: TransactionProcessor;
}

// Add to class:
private readonly transactionProcessor?: TransactionProcessor;

// In constructor:
this.transactionProcessor = deps.transactionProcessor;

// In processTransaction method, when localTx is not found:
if (!localTx) {
  // Use TransactionProcessor to fetch, classify, and upsert
  if (this.transactionProcessor) {
    try {
      await this.transactionProcessor.process(job.chain, hash);
    } catch (error) {
      console.error(`Failed to process transaction ${hash}:`, error);
    }
  }

  await this.jobRepository.addAuditEntry({
    jobId: job.id,
    transactionHash: hash,
    action: 'added',
    afterSnapshot: providerTx.rawData,
  });
  progress.transactionsAdded++;
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/services/reconciliation/reconciliation-worker-integration.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/reconciliation/reconciliation-worker.ts tests/unit/services/reconciliation/reconciliation-worker-integration.test.ts
git commit -m "feat(reconciliation): integrate TransactionProcessor with worker"
```

---

## Summary

This plan implements the Transaction Processor in 12 tasks:

1. **Core Types** - Foundation interfaces
2. **Token Metadata Fetcher** - On-chain + CoinGecko lookup
3. **EVM Chain Fetcher** - Fetch EVM transactions via RPC
4. **SVM Chain Fetcher** - Fetch Solana transactions via RPC
5. **Chain Fetcher Registry** - Route to correct fetcher
6. **EVM Classifier** - Classify EVM transactions
7. **SVM Classifier** - Classify Solana transactions
8. **Noves Classifier Adapter** - Fallback classification
9. **Classifier Registry** - Custom-first with fallback
10. **Transaction Upserter** - Atomic DB upserts
11. **TransactionProcessor** - Main orchestrator
12. **Reconciliation Integration** - Wire into existing worker

Each task follows TDD with failing test → implementation → passing test → commit.
