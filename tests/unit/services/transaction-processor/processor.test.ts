import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
const mockClassify = vi.fn();
const mockUpsert = vi.fn();
const mockFetchToken = vi.fn();

vi.mock('@/src/services/transaction-processor/chain-fetcher.js', () => ({
  ChainFetcherRegistry: vi.fn().mockImplementation(() => ({
    fetch: mockFetch,
  })),
}));

vi.mock('@/src/services/transaction-processor/classifier.js', () => ({
  ClassifierRegistry: vi.fn().mockImplementation(() => ({
    classify: mockClassify,
  })),
}));

vi.mock('@/src/services/transaction-processor/upserter.js', () => ({
  TransactionUpserter: vi.fn().mockImplementation(() => ({
    upsert: mockUpsert,
  })),
}));

vi.mock('@/src/services/transaction-processor/token-metadata-fetcher.js', () => ({
  TokenMetadataFetcher: vi.fn().mockImplementation(() => ({
    fetch: mockFetchToken,
  })),
}));

import { TransactionProcessor } from '@/src/services/transaction-processor/index.js';

// Valid EVM transaction hash format for tests
const TEST_TX_HASH = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const NOTFOUND_TX_HASH = '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678';

describe('TransactionProcessor', () => {
  let processor: TransactionProcessor;

  beforeEach(() => {
    vi.clearAllMocks();

    processor = new TransactionProcessor({
      evmRpcUrls: { ethereum: 'https://eth.example.com' },
      svmRpcUrls: { solana: 'https://solana.example.com' },
      novesApiKey: 'test-key',
      db: {} as any,
    });

    mockFetch.mockResolvedValue({
      type: 'evm',
      hash: TEST_TX_HASH,
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
    const result = await processor.process('eth' as ChainAlias, TEST_TX_HASH);

    expect(mockFetch).toHaveBeenCalledWith('eth' as ChainAlias, 'mainnet', TEST_TX_HASH);
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

    await processor.process('eth' as ChainAlias, TEST_TX_HASH);

    expect(mockFetchToken).toHaveBeenCalledWith('eth' as ChainAlias, 'mainnet', '0xtoken');
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

    const result = await processor.process('eth' as ChainAlias, TEST_TX_HASH);

    expect(result.transactionId).toBe('tx-123');
  });

  it('throws when transaction not found', async () => {
    mockFetch.mockRejectedValue(new Error('Transaction not found'));

    await expect(processor.process('eth' as ChainAlias, NOTFOUND_TX_HASH)).rejects.toThrow(
      'Transaction not found'
    );
  });
});
