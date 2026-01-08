import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock client functions - hoisted so they need to be outside factory
const mockEvmStartTransactionJob = vi.fn();
const mockEvmGetTransactionJobResults = vi.fn();
const mockSvmStartTransactionJob = vi.fn();
const mockSvmGetTransactionJobResults = vi.fn();
const mockUtxoStartTransactionJob = vi.fn();
const mockUtxoGetTransactionJobResults = vi.fn();
const mockGetTransactions = vi.fn();

// Mock the @noves/noves-sdk module before importing the provider
vi.mock('@noves/noves-sdk', () => {
  // Define MockTransactionError inside factory to avoid hoisting issues
  class MockTransactionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'TransactionError';
    }
  }

  return {
    Translate: {
      evm: vi.fn(() => ({
        getTransactions: mockGetTransactions,
        startTransactionJob: mockEvmStartTransactionJob,
        getTransactionJobResults: mockEvmGetTransactionJobResults,
      })),
      svm: vi.fn(() => ({
        getTransactions: mockGetTransactions,
        startTransactionJob: mockSvmStartTransactionJob,
        getTransactionJobResults: mockSvmGetTransactionJobResults,
      })),
      utxo: vi.fn(() => ({
        getTransactions: mockGetTransactions,
        startTransactionJob: mockUtxoStartTransactionJob,
        getTransactionJobResults: mockUtxoGetTransactionJobResults,
      })),
      xrpl: vi.fn(() => ({
        getTransactions: mockGetTransactions,
      })),
    },
    TransactionsPage: {
      fromCursor: vi.fn(),
    },
    TransactionError: MockTransactionError,
  };
});

// Import after mocking
import { NovesProvider } from '@/src/services/reconciliation/providers/noves-provider.js';
import { TransactionError } from '@noves/noves-sdk';

describe('NovesProvider - Async Jobs', () => {
  let provider: NovesProvider;
  const testApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new NovesProvider(testApiKey);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('supportsAsyncJobs', () => {
    it('should return true for EVM chain aliases', () => {
      expect(provider.supportsAsyncJobs('eth' as ChainAlias)).toBe(true);
      expect(provider.supportsAsyncJobs('polygon' as ChainAlias)).toBe(true);
      expect(provider.supportsAsyncJobs('arbitrum' as ChainAlias)).toBe(true);
      expect(provider.supportsAsyncJobs('optimism' as ChainAlias)).toBe(true);
      expect(provider.supportsAsyncJobs('base' as ChainAlias)).toBe(true);
      expect(provider.supportsAsyncJobs('avalanche-c' as ChainAlias)).toBe(true);
      expect(provider.supportsAsyncJobs('bsc' as ChainAlias)).toBe(true);
      expect(provider.supportsAsyncJobs('fantom' as ChainAlias)).toBe(true);
    });

    it('should return true for SVM chain aliases', () => {
      expect(provider.supportsAsyncJobs('solana' as ChainAlias)).toBe(true);
    });

    it('should return true for UTXO chain aliases', () => {
      expect(provider.supportsAsyncJobs('bitcoin' as ChainAlias)).toBe(true);
      expect(provider.supportsAsyncJobs('litecoin' as ChainAlias)).toBe(true);
    });

    it('should return false for XRPL', () => {
      expect(provider.supportsAsyncJobs('ripple' as ChainAlias)).toBe(false);
    });

    it('should return false for unsupported chain aliases', () => {
      expect(provider.supportsAsyncJobs('unknown-chain' as ChainAlias)).toBe(false);
    });
  });

  describe('startAsyncJob', () => {
    it('should call SDK method for EVM chain aliases', async () => {
      const mockResponse = {
        jobId: 'job-123',
        nextPageUrl: 'https://translate.noves.fi/evm/eth/txs/job/job-123',
      };

      mockEvmStartTransactionJob.mockResolvedValueOnce(mockResponse);

      const result = await provider.startAsyncJob('eth' as ChainAlias, '0x1234567890abcdef', {
        startBlock: 100,
        endBlock: 200,
      });

      expect(mockEvmStartTransactionJob).toHaveBeenCalledWith(
        'eth',
        '0x1234567890abcdef',
        100,
        200,
        true, // v5Format
        false // excludeSpam
      );

      expect(result.jobId).toBe('job-123');
      expect(result.nextPageUrl).toBe(mockResponse.nextPageUrl);
    });

    it('should use default block values when not provided for EVM', async () => {
      const mockResponse = {
        jobId: 'job-456',
        nextPageUrl: 'https://translate.noves.fi/evm/eth/txs/job/job-456',
      };

      mockEvmStartTransactionJob.mockResolvedValueOnce(mockResponse);

      await provider.startAsyncJob('eth' as ChainAlias, '0x1234567890abcdef');

      expect(mockEvmStartTransactionJob).toHaveBeenCalledWith(
        'eth',
        '0x1234567890abcdef',
        0, // default startBlock
        0, // default endBlock
        true,
        false
      );
    });

    it('should call SDK method for SVM chain aliases', async () => {
      const mockResponse = {
        jobId: 'job-456',
        nextPageUrl: 'https://translate.noves.fi/svm/solana/txs/job/job-456',
      };

      mockSvmStartTransactionJob.mockResolvedValueOnce(mockResponse);

      const result = await provider.startAsyncJob('solana' as ChainAlias, 'SolanaAddress123');

      expect(mockSvmStartTransactionJob).toHaveBeenCalledWith(
        'solana',
        'SolanaAddress123',
        0, // startTimestamp
        false // validateStartTimestamp
      );

      expect(result.jobId).toBe('job-456');
      expect(result.nextPageUrl).toBe(mockResponse.nextPageUrl);
    });

    it('should call SDK method for UTXO chain aliases', async () => {
      const mockResponse = {
        jobId: 'job-789',
        nextPageUrl: 'https://translate.noves.fi/utxo/btc/txs/job/job-789',
      };

      mockUtxoStartTransactionJob.mockResolvedValueOnce(mockResponse);

      const result = await provider.startAsyncJob('bitcoin' as ChainAlias, 'bc1qaddress', {
        startBlock: 800000,
        endBlock: 850000,
      });

      expect(mockUtxoStartTransactionJob).toHaveBeenCalledWith(
        'btc',
        'bc1qaddress',
        800000,
        850000
      );

      expect(result.jobId).toBe('job-789');
      expect(result.nextPageUrl).toBe(mockResponse.nextPageUrl);
    });

    it('should throw error for unsupported chain alias', async () => {
      await expect(provider.startAsyncJob('ripple' as ChainAlias, 'rAddress')).rejects.toThrow(
        'Chain alias ripple does not support async jobs'
      );
    });

    it('should wrap TransactionError with descriptive message', async () => {
      // Cast to any since mock TransactionError has different constructor than real SDK type
      mockEvmStartTransactionJob.mockRejectedValueOnce(new (TransactionError as any)('API rate limited'));

      await expect(provider.startAsyncJob('eth' as ChainAlias, '0x1234567890abcdef')).rejects.toThrow(
        'Failed to start async job: API rate limited'
      );
    });

    it('should rethrow non-TransactionError errors', async () => {
      const networkError = new Error('Network failure');
      mockEvmStartTransactionJob.mockRejectedValueOnce(networkError);

      await expect(provider.startAsyncJob('eth' as ChainAlias, '0x1234567890abcdef')).rejects.toThrow(
        'Network failure'
      );
    });
  });

  describe('fetchAsyncJobResults', () => {
    it('should return not ready when SDK throws "not ready" error', async () => {
      // Cast to any since mock TransactionError has different constructor than real SDK type
      mockEvmGetTransactionJobResults.mockRejectedValueOnce(
        new (TransactionError as any)('Job is not ready yet')
      );

      const result = await provider.fetchAsyncJobResults(
        'https://translate.noves.fi/evm/eth/txs/job/job-123'
      );

      expect(result).toEqual({
        transactions: [],
        nextPageUrl: 'https://translate.noves.fi/evm/eth/txs/job/job-123',
        isReady: false,
        isComplete: false,
      });
    });

    it('should return not ready when SDK throws "not finished" error', async () => {
      // Cast to any since mock TransactionError has different constructor than real SDK type
      mockEvmGetTransactionJobResults.mockRejectedValueOnce(
        new (TransactionError as any)('Results not finished processing')
      );

      const result = await provider.fetchAsyncJobResults(
        'https://translate.noves.fi/evm/eth/txs/job/job-123'
      );

      expect(result).toEqual({
        transactions: [],
        nextPageUrl: 'https://translate.noves.fi/evm/eth/txs/job/job-123',
        isReady: false,
        isComplete: false,
      });
    });

    it('should return transactions when job is ready', async () => {
      const mockTransactions = [
        { rawTransactionData: { transactionHash: '0xabc' } },
        { rawTransactionData: { transactionHash: '0xdef' } },
      ];

      mockEvmGetTransactionJobResults.mockResolvedValueOnce({
        items: mockTransactions,
        nextPageUrl: 'https://translate.noves.fi/evm/eth/txs/job/job-123?page=1',
        hasNextPage: true,
      });

      const result = await provider.fetchAsyncJobResults(
        'https://translate.noves.fi/evm/eth/txs/job/job-123'
      );

      expect(result.transactions).toEqual(mockTransactions);
      expect(result.nextPageUrl).toBe('https://translate.noves.fi/evm/eth/txs/job/job-123?page=1');
      expect(result.isReady).toBe(true);
      expect(result.isComplete).toBe(false);
    });

    it('should detect job completion when hasNextPage is false', async () => {
      const mockTransactions = [{ rawTransactionData: { transactionHash: '0xghi' } }];

      mockEvmGetTransactionJobResults.mockResolvedValueOnce({
        items: mockTransactions,
        nextPageUrl: null,
        hasNextPage: false,
      });

      const result = await provider.fetchAsyncJobResults(
        'https://translate.noves.fi/evm/eth/txs/job/job-123?page=5'
      );

      expect(result.transactions).toEqual(mockTransactions);
      expect(result.nextPageUrl).toBeUndefined();
      expect(result.isReady).toBe(true);
      expect(result.isComplete).toBe(true);
    });

    it('should handle empty items array when job is complete', async () => {
      mockEvmGetTransactionJobResults.mockResolvedValueOnce({
        items: [],
        nextPageUrl: null,
        hasNextPage: false,
      });

      const result = await provider.fetchAsyncJobResults(
        'https://translate.noves.fi/evm/eth/txs/job/job-123'
      );

      expect(result.transactions).toEqual([]);
      expect(result.isReady).toBe(true);
      expect(result.isComplete).toBe(true);
    });

    it('should throw wrapped error on other TransactionError', async () => {
      // Cast to any since mock TransactionError has different constructor than real SDK type
      mockEvmGetTransactionJobResults.mockRejectedValueOnce(
        new (TransactionError as any)('Invalid job ID')
      );

      await expect(
        provider.fetchAsyncJobResults('https://translate.noves.fi/evm/eth/txs/job/invalid-job')
      ).rejects.toThrow('Failed to fetch async job results: Invalid job ID');
    });

    it('should rethrow non-TransactionError errors', async () => {
      const networkError = new Error('Connection timeout');
      mockEvmGetTransactionJobResults.mockRejectedValueOnce(networkError);

      await expect(
        provider.fetchAsyncJobResults('https://translate.noves.fi/evm/eth/txs/job/job-123')
      ).rejects.toThrow('Connection timeout');
    });

    it('should parse URL and call correct ecosystem client', async () => {
      mockSvmGetTransactionJobResults.mockResolvedValueOnce({
        items: [],
        nextPageUrl: null,
        hasNextPage: false,
      });

      await provider.fetchAsyncJobResults(
        'https://translate.noves.fi/svm/solana/txs/job/svm-job-123'
      );

      expect(mockSvmGetTransactionJobResults).toHaveBeenCalledWith('solana', 'svm-job-123', {});
    });

    it('should parse URL with query params and pass as pageOptions', async () => {
      mockUtxoGetTransactionJobResults.mockResolvedValueOnce({
        items: [],
        nextPageUrl: null,
        hasNextPage: false,
      });

      await provider.fetchAsyncJobResults(
        'https://translate.noves.fi/utxo/btc/txs/job/utxo-job-123?pageSize=50&cursor=abc'
      );

      expect(mockUtxoGetTransactionJobResults).toHaveBeenCalledWith('btc', 'utxo-job-123', {
        pageSize: 50,
        cursor: 'abc',
      });
    });

    it('should throw error for invalid URL format', async () => {
      await expect(provider.fetchAsyncJobResults('not-a-valid-url')).rejects.toThrow(
        'Invalid job URL format'
      );
    });

    it('should throw error for URL with wrong path structure', async () => {
      await expect(
        provider.fetchAsyncJobResults('https://translate.noves.fi/evm/eth/wrong/path')
      ).rejects.toThrow('Invalid job URL path format');
    });

    it('should throw error for unsupported ecosystem in URL', async () => {
      await expect(
        provider.fetchAsyncJobResults('https://translate.noves.fi/xrpl/xrpl/txs/job/job-123')
      ).rejects.toThrow('Unsupported ecosystem in job URL: xrpl');
    });
  });
});
