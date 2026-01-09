// packages/chains/tests/unit/evm/transaction-fetcher.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvmTransactionFetcher } from '../../../src/evm/transaction-fetcher.js';
import { TransactionNotFoundError, InvalidTransactionHashError } from '../../../src/core/errors.js';
import { mockEvmConfig, TEST_DATA, EVENT_TOPICS } from '../../fixtures/config.js';

const { txHash: TEST_TX_HASH, sender: TEST_SENDER, recipient: TEST_RECIPIENT } = TEST_DATA.evm;

describe('EvmTransactionFetcher', () => {
  let fetcher: EvmTransactionFetcher;
  let mockRpcCall: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRpcCall = vi.fn();
    fetcher = new EvmTransactionFetcher(mockEvmConfig, 'ethereum', mockRpcCall);
  });

  describe('validateTransactionHash', () => {
    it('throws for hash with wrong length', async () => {
      await expect(fetcher.getTransaction('0x123')).rejects.toThrow(InvalidTransactionHashError);
    });

    it('throws for hash without 0x prefix', async () => {
      const hashWithoutPrefix = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      await expect(fetcher.getTransaction(hashWithoutPrefix)).rejects.toThrow(InvalidTransactionHashError);
    });

    it('throws for hash with invalid characters', async () => {
      const invalidHash = '0xgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg';
      await expect(fetcher.getTransaction(invalidHash)).rejects.toThrow(InvalidTransactionHashError);
    });
  });

  describe('getTransaction', () => {
    it('fetches and normalizes a confirmed transaction', async () => {
      const mockTransaction = {
        hash: TEST_TX_HASH,
        nonce: '0x5',
        blockHash: '0xblock123',
        blockNumber: '0x100',
        transactionIndex: '0x0',
        from: TEST_SENDER,
        to: TEST_RECIPIENT,
        value: '0xde0b6b3a7640000', // 1 ETH
        gasPrice: '0x2540be400',
        gas: '0x5208',
        input: '0x',
        type: '0x2',
      };

      const mockReceipt = {
        transactionHash: TEST_TX_HASH,
        blockHash: '0xblock123',
        blockNumber: '0x100',
        gasUsed: '0x5208',
        effectiveGasPrice: '0x2540be400',
        status: '0x1',
        logs: [],
        contractAddress: null,
      };

      // Mock transaction fetch
      mockRpcCall.mockResolvedValueOnce(JSON.stringify(mockTransaction));
      // Mock receipt fetch
      mockRpcCall.mockResolvedValueOnce(JSON.stringify(mockReceipt));
      // Mock trace (fails gracefully)
      mockRpcCall.mockRejectedValueOnce(new Error('Tracing not supported'));

      const result = await fetcher.getTransaction(TEST_TX_HASH);

      expect(result.chainAlias).toBe('ethereum');
      expect(result.raw._chain).toBe('evm');
      expect(result.normalized.hash).toBe(TEST_TX_HASH);
      expect(result.normalized.status).toBe('confirmed');
      expect(result.normalized.from).toBe(TEST_SENDER);
      expect(result.normalized.to).toBe(TEST_RECIPIENT);
      expect(result.normalized.value).toBe('1000000000000000000');
      expect(result.normalized.hasFullInternalData).toBe(false); // Trace failed
    });

    it('returns pending status for unconfirmed transaction', async () => {
      const mockTransaction = {
        hash: TEST_TX_HASH,
        nonce: '0x5',
        blockHash: null,
        blockNumber: null,
        transactionIndex: null,
        from: TEST_SENDER,
        to: TEST_RECIPIENT,
        value: '0xde0b6b3a7640000',
        gasPrice: '0x2540be400',
        gas: '0x5208',
        input: '0x',
        type: '0x2',
      };

      mockRpcCall.mockResolvedValueOnce(JSON.stringify(mockTransaction));
      mockRpcCall.mockResolvedValueOnce('null'); // No receipt yet
      mockRpcCall.mockRejectedValueOnce(new Error('Tracing not supported'));

      const result = await fetcher.getTransaction(TEST_TX_HASH);

      expect(result.normalized.status).toBe('pending');
      expect(result.normalized.blockNumber).toBeNull();
    });

    it('returns failed status for reverted transaction', async () => {
      const mockTransaction = {
        hash: TEST_TX_HASH,
        nonce: '0x5',
        blockHash: '0xblock123',
        blockNumber: '0x100',
        transactionIndex: '0x0',
        from: TEST_SENDER,
        to: TEST_RECIPIENT,
        value: '0x0',
        gasPrice: '0x2540be400',
        gas: '0x5208',
        input: '0x',
        type: '0x2',
      };

      const mockReceipt = {
        transactionHash: TEST_TX_HASH,
        blockHash: '0xblock123',
        blockNumber: '0x100',
        gasUsed: '0x5208',
        effectiveGasPrice: '0x2540be400',
        status: '0x0', // Failed
        logs: [],
        contractAddress: null,
      };

      mockRpcCall.mockResolvedValueOnce(JSON.stringify(mockTransaction));
      mockRpcCall.mockResolvedValueOnce(JSON.stringify(mockReceipt));
      mockRpcCall.mockRejectedValueOnce(new Error('Tracing not supported'));

      const result = await fetcher.getTransaction(TEST_TX_HASH);

      expect(result.normalized.status).toBe('failed');
    });

    it('throws TransactionNotFoundError when transaction does not exist', async () => {
      mockRpcCall.mockResolvedValueOnce('null');
      mockRpcCall.mockResolvedValueOnce('null');

      await expect(fetcher.getTransaction(TEST_TX_HASH)).rejects.toThrow(TransactionNotFoundError);
    });

    it('parses ERC20 Transfer events from logs', async () => {
      const fromTopic = '0x000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f88e26';
      const toTopic = '0x0000000000000000000000008ba1f109551bd432803012645ac136ddd64dba72';
      const valueData = '0x00000000000000000000000000000000000000000000000000000000000f4240'; // 1000000

      const mockTransaction = {
        hash: TEST_TX_HASH,
        nonce: '0x5',
        blockHash: '0xblock123',
        blockNumber: '0x100',
        transactionIndex: '0x0',
        from: TEST_SENDER,
        to: TEST_DATA.evm.usdtContract,
        value: '0x0',
        gasPrice: '0x2540be400',
        gas: '0xea60',
        input: '0xa9059cbb',
        type: '0x2',
      };

      const mockReceipt = {
        transactionHash: TEST_TX_HASH,
        blockHash: '0xblock123',
        blockNumber: '0x100',
        gasUsed: '0xea60',
        effectiveGasPrice: '0x2540be400',
        status: '0x1',
        logs: [
          {
            address: TEST_DATA.evm.usdtContract,
            topics: [EVENT_TOPICS.erc20Transfer, fromTopic, toTopic],
            data: valueData,
            logIndex: '0x0',
          },
        ],
        contractAddress: null,
      };

      mockRpcCall.mockResolvedValueOnce(JSON.stringify(mockTransaction));
      mockRpcCall.mockResolvedValueOnce(JSON.stringify(mockReceipt));
      mockRpcCall.mockRejectedValueOnce(new Error('Tracing not supported'));

      const result = await fetcher.getTransaction(TEST_TX_HASH);

      expect(result.normalized.tokenTransfers).toHaveLength(1);
      expect(result.normalized.tokenTransfers[0]).toMatchObject({
        contractAddress: TEST_DATA.evm.usdtContract,
        from: '0x742d35cc6634c0532925a3b844bc9e7595f88e26',
        to: '0x8ba1f109551bd432803012645ac136ddd64dba72',
        value: '1000000',
        tokenType: 'erc20',
        logIndex: 0,
      });
    });

    it('parses internal transactions when trace is available', async () => {
      const mockTransaction = {
        hash: TEST_TX_HASH,
        nonce: '0x5',
        blockHash: '0xblock123',
        blockNumber: '0x100',
        transactionIndex: '0x0',
        from: TEST_SENDER,
        to: TEST_RECIPIENT,
        value: '0xde0b6b3a7640000',
        gasPrice: '0x2540be400',
        gas: '0x5208',
        input: '0x',
        type: '0x2',
      };

      const mockReceipt = {
        transactionHash: TEST_TX_HASH,
        blockHash: '0xblock123',
        blockNumber: '0x100',
        gasUsed: '0x5208',
        effectiveGasPrice: '0x2540be400',
        status: '0x1',
        logs: [],
        contractAddress: null,
      };

      const mockTrace = {
        calls: [
          {
            from: TEST_SENDER,
            to: TEST_RECIPIENT,
            value: '0x0',
            type: 'CALL',
            input: '0x',
          },
        ],
      };

      mockRpcCall.mockResolvedValueOnce(JSON.stringify(mockTransaction));
      mockRpcCall.mockResolvedValueOnce(JSON.stringify(mockReceipt));
      mockRpcCall.mockResolvedValueOnce(JSON.stringify(mockTrace));

      const result = await fetcher.getTransaction(TEST_TX_HASH);

      expect(result.normalized.hasFullInternalData).toBe(true);
      expect(result.normalized.internalTransactions).toHaveLength(1);
      expect(result.normalized.internalTransactions[0]).toMatchObject({
        from: TEST_SENDER,
        to: TEST_RECIPIENT,
        type: 'call',
      });
    });
  });
});
