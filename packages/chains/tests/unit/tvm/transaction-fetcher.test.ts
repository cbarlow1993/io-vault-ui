// packages/chains/tests/unit/tvm/transaction-fetcher.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TvmTransactionFetcher } from '../../../src/tvm/transaction-fetcher.js';
import { TransactionNotFoundError, InvalidTransactionHashError } from '../../../src/core/errors.js';
import { mockTvmConfig, TEST_DATA, EVENT_TOPICS } from '../../fixtures/config.js';

const { txid: TEST_TXID, senderHex: TEST_SENDER_HEX, recipientHex: TEST_RECIPIENT_HEX, usdtContract: TEST_USDT_CONTRACT } = TEST_DATA.tvm;

describe('TvmTransactionFetcher', () => {
  let fetcher: TvmTransactionFetcher;
  let originalFetch: typeof global.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = global.fetch;
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    fetcher = new TvmTransactionFetcher(mockTvmConfig, 'tron');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('validateTransactionHash', () => {
    it('throws for txID with wrong length', async () => {
      await expect(fetcher.getTransaction('abc123')).rejects.toThrow(InvalidTransactionHashError);
    });

    it('throws for txID with 0x prefix', async () => {
      // 66 characters with 0x prefix is wrong - should be 64 hex chars without prefix
      const txidWithPrefix = '0x' + 'a'.repeat(64);
      await expect(fetcher.getTransaction(txidWithPrefix)).rejects.toThrow(InvalidTransactionHashError);
    });

    it('throws for txID with invalid characters', async () => {
      const invalidTxid = 'g'.repeat(64); // 'g' is not valid hex
      await expect(fetcher.getTransaction(invalidTxid)).rejects.toThrow(InvalidTransactionHashError);
    });
  });

  describe('getTransaction', () => {
    it('fetches and normalizes a confirmed transaction', async () => {
      const mockTransaction = {
        txID: TEST_TXID,
        raw_data: {
          contract: [
            {
              parameter: {
                value: {
                  owner_address: TEST_SENDER_HEX,
                  to_address: TEST_RECIPIENT_HEX,
                  amount: 1000000, // 1 TRX
                },
                type_url: 'type.googleapis.com/protocol.TransferContract',
              },
              type: 'TransferContract',
            },
          ],
          ref_block_bytes: '1234',
          ref_block_hash: 'abcd1234',
          expiration: 1704070800000,
          timestamp: 1704067200000,
        },
        raw_data_hex: 'raw_hex',
        signature: ['sig'],
        ret: [{ contractRet: 'SUCCESS' }],
      };

      const mockInfo = {
        id: TEST_TXID,
        blockNumber: 50000000,
        blockTimeStamp: 1704067200000,
        contractResult: [''],
        receipt: {
          net_fee: 100,
          energy_fee: 0,
          result: 'SUCCESS',
        },
      };

      // Mock transaction fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTransaction),
      });
      // Mock info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInfo),
      });

      const result = await fetcher.getTransaction(TEST_TXID);

      expect(result.chainAlias).toBe('tron');
      expect(result.raw._chain).toBe('tvm');
      expect(result.normalized.hash).toBe(TEST_TXID);
      expect(result.normalized.status).toBe('confirmed');
      expect(result.normalized.value).toBe('1000000');
      expect(result.normalized.fee).toBe('100');
      expect(result.normalized.blockNumber).toBe(50000000);
    });

    it('returns pending status when info is not available', async () => {
      const mockTransaction = {
        txID: TEST_TXID,
        raw_data: {
          contract: [
            {
              parameter: {
                value: {
                  owner_address: TEST_SENDER_HEX,
                  to_address: TEST_RECIPIENT_HEX,
                  amount: 1000000,
                },
                type_url: 'type.googleapis.com/protocol.TransferContract',
              },
              type: 'TransferContract',
            },
          ],
          ref_block_bytes: '1234',
          ref_block_hash: 'abcd1234',
          expiration: 1704070800000,
          timestamp: 1704067200000,
        },
        raw_data_hex: 'raw_hex',
        signature: ['sig'],
      };

      // Mock transaction fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTransaction),
      });
      // Mock info fetch - empty response means pending
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await fetcher.getTransaction(TEST_TXID);

      expect(result.normalized.status).toBe('pending');
      expect(result.normalized.blockNumber).toBeNull();
    });

    it('returns failed status for failed transaction', async () => {
      const mockTransaction = {
        txID: TEST_TXID,
        raw_data: {
          contract: [
            {
              parameter: {
                value: {
                  owner_address: TEST_SENDER_HEX,
                  to_address: TEST_RECIPIENT_HEX,
                  amount: 1000000,
                },
                type_url: 'type.googleapis.com/protocol.TransferContract',
              },
              type: 'TransferContract',
            },
          ],
          ref_block_bytes: '1234',
          ref_block_hash: 'abcd1234',
          expiration: 1704070800000,
          timestamp: 1704067200000,
        },
        raw_data_hex: 'raw_hex',
        signature: ['sig'],
        ret: [{ contractRet: 'REVERT' }],
      };

      const mockInfo = {
        id: TEST_TXID,
        blockNumber: 50000000,
        blockTimeStamp: 1704067200000,
        contractResult: [''],
        receipt: {
          net_fee: 100,
          energy_fee: 50000,
          result: 'FAILED',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTransaction),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInfo),
      });

      const result = await fetcher.getTransaction(TEST_TXID);

      expect(result.normalized.status).toBe('failed');
    });

    it('throws TransactionNotFoundError when transaction does not exist', async () => {
      // Mock empty transaction response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await expect(fetcher.getTransaction(TEST_TXID)).rejects.toThrow(TransactionNotFoundError);
    });

    it('parses TRC20 Transfer events from logs', async () => {
      const fromTopic = '000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f88e26';
      const toTopic = '0000000000000000000000008ba1f109551bd432803012645ac136ddd64dba72';
      const valueData = '00000000000000000000000000000000000000000000000000000000000f4240'; // 1000000

      const mockTransaction = {
        txID: TEST_TXID,
        raw_data: {
          contract: [
            {
              parameter: {
                value: {
                  owner_address: TEST_SENDER_HEX,
                  contract_address: TEST_USDT_CONTRACT,
                  data: 'a9059cbb',
                },
                type_url: 'type.googleapis.com/protocol.TriggerSmartContract',
              },
              type: 'TriggerSmartContract',
            },
          ],
          ref_block_bytes: '1234',
          ref_block_hash: 'abcd1234',
          expiration: 1704070800000,
          timestamp: 1704067200000,
        },
        raw_data_hex: 'raw_hex',
        signature: ['sig'],
        ret: [{ contractRet: 'SUCCESS' }],
      };

      const mockInfo = {
        id: TEST_TXID,
        blockNumber: 50000000,
        blockTimeStamp: 1704067200000,
        contractResult: [''],
        receipt: {
          net_fee: 0,
          energy_fee: 30000,
          energy_usage_total: 15000,
          result: 'SUCCESS',
        },
        log: [
          {
            address: 'a614f803b6fd780986a42c78ec9c7f77e6ded13c',
            topics: [EVENT_TOPICS.trc20Transfer, fromTopic, toTopic],
            data: valueData,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTransaction),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInfo),
      });

      const result = await fetcher.getTransaction(TEST_TXID);

      expect(result.normalized.tokenTransfers).toHaveLength(1);
      expect(result.normalized.tokenTransfers[0]).toMatchObject({
        tokenType: 'trc20',
        value: '1000000',
        logIndex: 0,
      });
    });

    it('parses internal transactions', async () => {
      const mockTransaction = {
        txID: TEST_TXID,
        raw_data: {
          contract: [
            {
              parameter: {
                value: {
                  owner_address: TEST_SENDER_HEX,
                  contract_address: TEST_USDT_CONTRACT,
                  data: 'somedata',
                },
                type_url: 'type.googleapis.com/protocol.TriggerSmartContract',
              },
              type: 'TriggerSmartContract',
            },
          ],
          ref_block_bytes: '1234',
          ref_block_hash: 'abcd1234',
          expiration: 1704070800000,
          timestamp: 1704067200000,
        },
        raw_data_hex: 'raw_hex',
        signature: ['sig'],
        ret: [{ contractRet: 'SUCCESS' }],
      };

      const mockInfo = {
        id: TEST_TXID,
        blockNumber: 50000000,
        blockTimeStamp: 1704067200000,
        contractResult: [''],
        receipt: {
          net_fee: 0,
          energy_fee: 50000,
          result: 'SUCCESS',
        },
        internal_transactions: [
          {
            caller_address: TEST_SENDER_HEX,
            transferTo_address: TEST_RECIPIENT_HEX,
            callValueInfo: [{ callValue: 500000 }],
            note: 'call',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTransaction),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInfo),
      });

      const result = await fetcher.getTransaction(TEST_TXID);

      expect(result.normalized.internalTransactions).toHaveLength(1);
      expect(result.normalized.internalTransactions[0]).toMatchObject({
        value: '500000',
        type: 'call',
        traceIndex: 0,
      });
      expect(result.normalized.hasFullInternalData).toBe(true);
    });

    it('calculates fee from net_fee and energy_fee', async () => {
      const mockTransaction = {
        txID: TEST_TXID,
        raw_data: {
          contract: [
            {
              parameter: {
                value: {
                  owner_address: TEST_SENDER_HEX,
                  to_address: TEST_RECIPIENT_HEX,
                  amount: 1000000,
                },
                type_url: 'type.googleapis.com/protocol.TransferContract',
              },
              type: 'TransferContract',
            },
          ],
          ref_block_bytes: '1234',
          ref_block_hash: 'abcd1234',
          expiration: 1704070800000,
          timestamp: 1704067200000,
        },
        raw_data_hex: 'raw_hex',
        signature: ['sig'],
        ret: [{ contractRet: 'SUCCESS' }],
      };

      const mockInfo = {
        id: TEST_TXID,
        blockNumber: 50000000,
        blockTimeStamp: 1704067200000,
        contractResult: [''],
        receipt: {
          net_fee: 280,
          energy_fee: 50000,
          result: 'SUCCESS',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTransaction),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInfo),
      });

      const result = await fetcher.getTransaction(TEST_TXID);

      expect(result.normalized.fee).toBe('50280'); // 280 + 50000
    });
  });
});
