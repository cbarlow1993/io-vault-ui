import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

// Mock the @noves/noves-sdk module before importing the provider
vi.mock('@noves/noves-sdk', () => {
  const mockGetTransactions = vi.fn();
  const mockTransactionsPageFromCursor = vi.fn();

  // Create mock page object
  const createMockPage = (transactions: unknown[], nextCursor: string | null) => ({
    getTransactions: () => transactions,
    getNextCursor: () => nextCursor,
  });

  return {
    Translate: {
      evm: vi.fn(() => ({
        getTransactions: mockGetTransactions,
      })),
      svm: vi.fn(() => ({
        getTransactions: mockGetTransactions,
      })),
      utxo: vi.fn(() => ({
        getTransactions: mockGetTransactions,
      })),
      xrpl: vi.fn(() => ({
        getTransactions: mockGetTransactions,
      })),
    },
    TransactionsPage: {
      fromCursor: mockTransactionsPageFromCursor,
    },
    // Export the mock functions so tests can configure them
    __mocks: {
      mockGetTransactions,
      mockTransactionsPageFromCursor,
      createMockPage,
    },
  };
});

// Import after mocking
import { NovesProvider } from '@/src/services/reconciliation/providers/noves-provider.js';
import type { ProviderTransaction } from '@/src/services/reconciliation/providers/types.js';
import { Translate } from '@noves/noves-sdk';

// Access the mock utilities
const { __mocks } = await import('@noves/noves-sdk') as unknown as {
  __mocks: {
    mockGetTransactions: ReturnType<typeof vi.fn>;
    mockTransactionsPageFromCursor: ReturnType<typeof vi.fn>;
    createMockPage: (transactions: unknown[], nextCursor: string | null) => {
      getTransactions: () => unknown[];
      getNextCursor: () => string | null;
    };
  };
};

describe('NovesProvider', () => {
  let provider: NovesProvider;
  const testApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new NovesProvider(testApiKey);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with the given API key', () => {
      expect(provider).toBeDefined();
      expect(Translate.evm).toHaveBeenCalledWith(testApiKey);
      expect(Translate.svm).toHaveBeenCalledWith(testApiKey);
      expect(Translate.utxo).toHaveBeenCalledWith(testApiKey);
      expect(Translate.xrpl).toHaveBeenCalledWith(testApiKey);
    });
  });

  describe('name', () => {
    it('should return "noves"', () => {
      expect(provider.name).toBe('noves');
    });
  });

  describe('supportedChainAliases', () => {
    it('should include eth', () => {
      expect(provider.supportedChainAliases).toContain('eth' as ChainAlias);
    });

    it('should include polygon', () => {
      expect(provider.supportedChainAliases).toContain('polygon' as ChainAlias);
    });

    it('should include arbitrum', () => {
      expect(provider.supportedChainAliases).toContain('arbitrum' as ChainAlias);
    });

    it('should include solana', () => {
      expect(provider.supportedChainAliases).toContain('solana' as ChainAlias);
    });

    it('should include bitcoin', () => {
      expect(provider.supportedChainAliases).toContain('bitcoin' as ChainAlias);
    });

    it('should include ripple', () => {
      expect(provider.supportedChainAliases).toContain('ripple' as ChainAlias);
    });

    it('should include base', () => {
      expect(provider.supportedChainAliases).toContain('base' as ChainAlias);
    });

    it('should include optimism', () => {
      expect(provider.supportedChainAliases).toContain('optimism' as ChainAlias);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is accessible', async () => {
      // Mock a successful API call
      __mocks.mockGetTransactions.mockResolvedValueOnce(
        __mocks.createMockPage([], null)
      );

      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API throws an error', async () => {
      // Mock a failed API call
      __mocks.mockGetTransactions.mockRejectedValueOnce(
        new Error('API Error')
      );

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('fetchTransactions', () => {
    it('should throw error for unsupported chain alias', async () => {
      const generator = provider.fetchTransactions(
        '0x1234',
        'unsupported-chain-alias' as ChainAlias
      );

      await expect(generator.next()).rejects.toThrow(
        'Unsupported chain alias: unsupported-chain-alias'
      );
    });

    it('should yield transactions from EVM chain', async () => {
      const mockTransaction = {
        rawTransactionData: {
          transactionHash: '0xabc123',
          timestamp: '2024-01-15T10:00:00Z',
          fromAddress: '0xfrom',
          toAddress: '0xto',
          transactionFee: {
            amount: '0.001',
          },
        },
        classificationData: {
          type: 'transfer',
          description: 'Token Transfer',
        },
        accountAddress: '0x1234',
      };

      const mockPage = __mocks.createMockPage([mockTransaction], null);
      __mocks.mockGetTransactions.mockResolvedValueOnce(mockPage);

      const transactions: ProviderTransaction[] = [];
      for await (const tx of provider.fetchTransactions(
        '0x1234',
        'eth' as ChainAlias
      )) {
        transactions.push(tx);
      }

      expect(transactions).toHaveLength(1);
      expect(transactions[0]!.transactionHash).toBe('0xabc123');
      expect(transactions[0]!.chainAlias).toBe('eth' as ChainAlias);
      expect(transactions[0]!.normalized.fromAddress).toBe('0xfrom');
      expect(transactions[0]!.normalized.toAddress).toBe('0xto');
    });

    it('should handle pagination with cursor', async () => {
      const mockTx1 = {
        rawTransactionData: {
          transactionHash: '0xfirst',
          timestamp: '2024-01-15T09:00:00Z',
          fromAddress: '0xfrom1',
          toAddress: '0xto1',
        },
        classificationData: {},
      };

      const mockTx2 = {
        rawTransactionData: {
          transactionHash: '0xsecond',
          timestamp: '2024-01-15T10:00:00Z',
          fromAddress: '0xfrom2',
          toAddress: '0xto2',
        },
        classificationData: {},
      };

      // First page returns one transaction and a cursor
      const page1 = __mocks.createMockPage([mockTx1], 'cursor-page-2');
      __mocks.mockGetTransactions.mockResolvedValueOnce(page1);

      // Second page returns one transaction and no cursor (end)
      const page2 = __mocks.createMockPage([mockTx2], null);
      __mocks.mockTransactionsPageFromCursor.mockResolvedValueOnce(page2);

      const transactions: ProviderTransaction[] = [];
      for await (const tx of provider.fetchTransactions(
        '0x1234',
        'eth' as ChainAlias
      )) {
        transactions.push(tx);
      }

      expect(transactions).toHaveLength(2);
      expect(transactions[0]!.transactionHash).toBe('0xfirst');
      expect(transactions[1]!.transactionHash).toBe('0xsecond');
      expect(__mocks.mockTransactionsPageFromCursor).toHaveBeenCalled();
    });

    it('should resume from provided cursor', async () => {
      const mockTx = {
        rawTransactionData: {
          transactionHash: '0xcursored',
          timestamp: '2024-01-15T10:00:00Z',
          fromAddress: '0xfrom',
          toAddress: '0xto',
        },
        classificationData: {},
      };

      const page = __mocks.createMockPage([mockTx], null);
      __mocks.mockTransactionsPageFromCursor.mockResolvedValueOnce(page);

      const transactions: ProviderTransaction[] = [];
      for await (const tx of provider.fetchTransactions(
        '0x1234',
        'eth' as ChainAlias,
        { cursor: 'existing-cursor' }
      )) {
        transactions.push(tx);
      }

      expect(transactions).toHaveLength(1);
      expect(transactions[0]!.transactionHash).toBe('0xcursored');
      // Should use TransactionsPage.fromCursor instead of getTransactions
      expect(__mocks.mockTransactionsPageFromCursor).toHaveBeenCalled();
    });

    it('should filter transactions by timestamp range', async () => {
      const mockTx1 = {
        rawTransactionData: {
          transactionHash: '0xbefore',
          timestamp: '2024-01-10T10:00:00Z',
          fromAddress: '0xfrom1',
          toAddress: '0xto1',
        },
        classificationData: {},
      };

      const mockTx2 = {
        rawTransactionData: {
          transactionHash: '0xinrange',
          timestamp: '2024-01-15T10:00:00Z',
          fromAddress: '0xfrom2',
          toAddress: '0xto2',
        },
        classificationData: {},
      };

      const mockTx3 = {
        rawTransactionData: {
          transactionHash: '0xafter',
          timestamp: '2024-01-20T10:00:00Z',
          fromAddress: '0xfrom3',
          toAddress: '0xto3',
        },
        classificationData: {},
      };

      const page = __mocks.createMockPage([mockTx1, mockTx2, mockTx3], null);
      __mocks.mockGetTransactions.mockResolvedValueOnce(page);

      const transactions: ProviderTransaction[] = [];
      for await (const tx of provider.fetchTransactions(
        '0x1234',
        'eth' as ChainAlias,
        {
          fromTimestamp: new Date('2024-01-14T00:00:00Z'),
          toTimestamp: new Date('2024-01-16T00:00:00Z'),
        }
      )) {
        transactions.push(tx);
      }

      // Only the in-range transaction should be yielded
      expect(transactions).toHaveLength(1);
      expect(transactions[0]!.transactionHash).toBe('0xinrange');
    });

    it('should use correct client for Solana (SVM)', async () => {
      const mockTx = {
        rawTransactionData: {
          transactionHash: 'solana-tx-hash',
          timestamp: '2024-01-15T10:00:00Z',
          fromAddress: 'from-pubkey',
          toAddress: 'to-pubkey',
        },
        classificationData: {},
      };

      const page = __mocks.createMockPage([mockTx], null);
      __mocks.mockGetTransactions.mockResolvedValueOnce(page);

      const transactions: ProviderTransaction[] = [];
      for await (const tx of provider.fetchTransactions(
        'pubkey123',
        'solana' as ChainAlias
      )) {
        transactions.push(tx);
      }

      expect(transactions).toHaveLength(1);
      expect(transactions[0]!.chainAlias).toBe('solana' as ChainAlias);
    });

    it('should use correct client for Bitcoin (UTXO)', async () => {
      const mockTx = {
        rawTransactionData: {
          transactionHash: 'bitcoin-tx-hash',
          timestamp: '2024-01-15T10:00:00Z',
          fromAddress: 'bc1q...',
          toAddress: 'bc1p...',
        },
        classificationData: {},
      };

      const page = __mocks.createMockPage([mockTx], null);
      __mocks.mockGetTransactions.mockResolvedValueOnce(page);

      const transactions: ProviderTransaction[] = [];
      for await (const tx of provider.fetchTransactions(
        'bc1q123',
        'bitcoin' as ChainAlias
      )) {
        transactions.push(tx);
      }

      expect(transactions).toHaveLength(1);
      expect(transactions[0]!.chainAlias).toBe('bitcoin' as ChainAlias);
    });

    it('should use correct client for XRPL', async () => {
      const mockTx = {
        rawTransactionData: {
          transactionHash: 'xrpl-tx-hash',
          timestamp: '2024-01-15T10:00:00Z',
          fromAddress: 'rAddress...',
          toAddress: 'rOther...',
        },
        classificationData: {},
      };

      const page = __mocks.createMockPage([mockTx], null);
      __mocks.mockGetTransactions.mockResolvedValueOnce(page);

      const transactions: ProviderTransaction[] = [];
      for await (const tx of provider.fetchTransactions(
        'rAccount123',
        'ripple' as ChainAlias
      )) {
        transactions.push(tx);
      }

      expect(transactions).toHaveLength(1);
      expect(transactions[0]!.chainAlias).toBe('ripple' as ChainAlias);
    });

    it('should normalize transaction status correctly', async () => {
      const mockSuccessTx = {
        rawTransactionData: {
          transactionHash: '0xsuccess',
          timestamp: '2024-01-15T10:00:00Z',
          fromAddress: '0xfrom',
          toAddress: '0xto',
          status: 1,
        },
        classificationData: {},
      };

      const mockFailedTx = {
        rawTransactionData: {
          transactionHash: '0xfailed',
          timestamp: '2024-01-15T10:00:00Z',
          fromAddress: '0xfrom',
          toAddress: '0xto',
          status: 0,
        },
        classificationData: {},
      };

      const page = __mocks.createMockPage([mockSuccessTx, mockFailedTx], null);
      __mocks.mockGetTransactions.mockResolvedValueOnce(page);

      const transactions: ProviderTransaction[] = [];
      for await (const tx of provider.fetchTransactions(
        '0x1234',
        'eth' as ChainAlias
      )) {
        transactions.push(tx);
      }

      expect(transactions).toHaveLength(2);
      expect(transactions[0]!.transactionHash).toBe('0xsuccess');
      expect(transactions[1]!.transactionHash).toBe('0xfailed');
    });

    it('should pass block filtering parameters to SDK', async () => {
      const mockTx = {
        rawTransactionData: {
          transactionHash: '0xblockfiltered',
          timestamp: '2024-01-15T10:00:00Z',
          fromAddress: '0xfrom',
          toAddress: '0xto',
          blockNumber: 1000,
        },
        classificationData: {},
      };

      const page = __mocks.createMockPage([mockTx], null);
      __mocks.mockGetTransactions.mockResolvedValueOnce(page);

      const transactions: ProviderTransaction[] = [];
      for await (const tx of provider.fetchTransactions(
        '0x1234',
        'eth' as ChainAlias,
        { fromBlock: 100, toBlock: 2000 }
      )) {
        transactions.push(tx);
      }

      expect(transactions).toHaveLength(1);
      expect(__mocks.mockGetTransactions).toHaveBeenCalledWith('eth', '0x1234', {
        pageSize: 50,
        v5Format: true,
        liveData: true,
        startBlock: 100,
        endBlock: 2000,
      });
    });

    it('should pass only fromBlock when toBlock is not provided', async () => {
      const mockTx = {
        rawTransactionData: {
          transactionHash: '0xfromonly',
          timestamp: '2024-01-15T10:00:00Z',
          fromAddress: '0xfrom',
          toAddress: '0xto',
        },
        classificationData: {},
      };

      const page = __mocks.createMockPage([mockTx], null);
      __mocks.mockGetTransactions.mockResolvedValueOnce(page);

      const transactions: ProviderTransaction[] = [];
      for await (const tx of provider.fetchTransactions(
        '0x1234',
        'polygon' as ChainAlias,
        { fromBlock: 500 }
      )) {
        transactions.push(tx);
      }

      expect(transactions).toHaveLength(1);
      expect(__mocks.mockGetTransactions).toHaveBeenCalledWith('polygon', '0x1234', {
        pageSize: 50,
        v5Format: true,
        liveData: true,
        startBlock: 500,
        endBlock: undefined,
      });
    });

    it('should pass only toBlock when fromBlock is not provided', async () => {
      const mockTx = {
        rawTransactionData: {
          transactionHash: '0xtoonly',
          timestamp: '2024-01-15T10:00:00Z',
          fromAddress: '0xfrom',
          toAddress: '0xto',
        },
        classificationData: {},
      };

      const page = __mocks.createMockPage([mockTx], null);
      __mocks.mockGetTransactions.mockResolvedValueOnce(page);

      const transactions: ProviderTransaction[] = [];
      for await (const tx of provider.fetchTransactions(
        '0x1234',
        'arbitrum' as ChainAlias,
        { toBlock: 1500 }
      )) {
        transactions.push(tx);
      }

      expect(transactions).toHaveLength(1);
      expect(__mocks.mockGetTransactions).toHaveBeenCalledWith('arbitrum', '0x1234', {
        pageSize: 50,
        v5Format: true,
        liveData: true,
        startBlock: undefined,
        endBlock: 1500,
      });
    });

    it('should not pass block parameters when resuming from cursor', async () => {
      const mockTx = {
        rawTransactionData: {
          transactionHash: '0xcursorresume',
          timestamp: '2024-01-15T10:00:00Z',
          fromAddress: '0xfrom',
          toAddress: '0xto',
        },
        classificationData: {},
      };

      const page = __mocks.createMockPage([mockTx], null);
      __mocks.mockTransactionsPageFromCursor.mockResolvedValueOnce(page);

      const transactions: ProviderTransaction[] = [];
      for await (const tx of provider.fetchTransactions(
        '0x1234',
        'eth' as ChainAlias,
        { cursor: 'resume-cursor', fromBlock: 100, toBlock: 2000 }
      )) {
        transactions.push(tx);
      }

      expect(transactions).toHaveLength(1);
      // When cursor is provided, should use fromCursor instead of getTransactions
      expect(__mocks.mockTransactionsPageFromCursor).toHaveBeenCalled();
      expect(__mocks.mockGetTransactions).not.toHaveBeenCalled();
    });

    it('should include cursor in each yielded transaction', async () => {
      const mockTx = {
        rawTransactionData: {
          transactionHash: '0xtest',
          timestamp: '2024-01-15T10:00:00Z',
          fromAddress: '0xfrom',
          toAddress: '0xto',
        },
        classificationData: {},
      };

      const page = __mocks.createMockPage([mockTx], 'next-cursor-value');
      __mocks.mockGetTransactions.mockResolvedValueOnce(page);

      // Second call to stop pagination
      const page2 = __mocks.createMockPage([], null);
      __mocks.mockTransactionsPageFromCursor.mockResolvedValueOnce(page2);

      const transactions: ProviderTransaction[] = [];
      for await (const tx of provider.fetchTransactions(
        '0x1234',
        'eth' as ChainAlias
      )) {
        transactions.push(tx);
      }

      expect(transactions).toHaveLength(1);
      expect(transactions[0]!.cursor).toBeDefined();
      expect(typeof transactions[0]!.cursor).toBe('string');
    });
  });
});
