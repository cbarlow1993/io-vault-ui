// packages/chains/tests/unit/utxo/transaction-fetcher.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UtxoTransactionFetcher } from '../../../src/utxo/transaction-fetcher.js';
import { TransactionNotFoundError, InvalidTransactionHashError } from '../../../src/core/errors.js';
import { mockUtxoConfig, TEST_DATA } from '../../fixtures/config.js';
import type { BlockbookClient } from '../../../src/utxo/blockbook-client.js';

const { txid: TEST_TXID, sender: TEST_SENDER, recipient: TEST_RECIPIENT } = TEST_DATA.utxo;

describe('UtxoTransactionFetcher', () => {
  let fetcher: UtxoTransactionFetcher;
  let mockBlockbook: { getTransaction: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockBlockbook = {
      getTransaction: vi.fn(),
    };
    fetcher = new UtxoTransactionFetcher(
      mockUtxoConfig,
      'bitcoin',
      mockBlockbook as unknown as BlockbookClient
    );
  });

  describe('validateTransactionHash', () => {
    it('throws for txid with wrong length', async () => {
      await expect(fetcher.getTransaction('abc123')).rejects.toThrow(InvalidTransactionHashError);
    });

    it('throws for txid with 0x prefix', async () => {
      const txidWithPrefix = '0x' + 'a'.repeat(62);
      await expect(fetcher.getTransaction(txidWithPrefix)).rejects.toThrow(InvalidTransactionHashError);
    });

    it('throws for txid with invalid characters', async () => {
      const invalidTxid = 'g'.repeat(64); // 'g' is not valid hex
      await expect(fetcher.getTransaction(invalidTxid)).rejects.toThrow(InvalidTransactionHashError);
    });
  });

  describe('getTransaction', () => {
    it('fetches and normalizes a confirmed transaction', async () => {
      const mockTransaction = {
        txid: TEST_TXID,
        version: 2,
        vin: [
          {
            txid: 'prev_txid',
            vout: 0,
            sequence: 4294967295,
            addresses: [TEST_SENDER],
            value: '100000',
          },
        ],
        vout: [
          {
            value: '50000',
            n: 0,
            addresses: [TEST_RECIPIENT],
            isAddress: true,
          },
          {
            value: '49000',
            n: 1,
            addresses: [TEST_SENDER], // Change output
            isAddress: true,
          },
        ],
        blockHash: '00000000000000000002b5d3c5a8a9b8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2',
        blockHeight: 800000,
        confirmations: 6,
        blockTime: 1704067200,
        fees: '1000',
        size: 225,
        vsize: 140,
      };

      mockBlockbook.getTransaction.mockResolvedValueOnce(mockTransaction);

      const result = await fetcher.getTransaction(TEST_TXID);

      expect(result.chainAlias).toBe('bitcoin');
      expect(result.raw._chain).toBe('utxo');
      expect(result.normalized.hash).toBe(TEST_TXID);
      expect(result.normalized.status).toBe('confirmed');
      expect(result.normalized.from).toBe(TEST_SENDER);
      expect(result.normalized.to).toBe(TEST_RECIPIENT);
      expect(result.normalized.value).toBe('50000');
      expect(result.normalized.fee).toBe('1000');
      expect(result.normalized.blockNumber).toBe(800000);
      expect(result.normalized.confirmations).toBe(6);
      expect(result.normalized.finalized).toBe(true); // 6 confirmations
    });

    it('returns pending status for unconfirmed transaction', async () => {
      const mockTransaction = {
        txid: TEST_TXID,
        version: 2,
        vin: [
          {
            txid: 'prev_txid',
            vout: 0,
            sequence: 4294967295,
            addresses: [TEST_SENDER],
            value: '100000',
          },
        ],
        vout: [
          {
            value: '99000',
            n: 0,
            addresses: [TEST_RECIPIENT],
            isAddress: true,
          },
        ],
        confirmations: 0,
        fees: '1000',
        size: 225,
        vsize: 140,
      };

      mockBlockbook.getTransaction.mockResolvedValueOnce(mockTransaction);

      const result = await fetcher.getTransaction(TEST_TXID);

      expect(result.normalized.status).toBe('pending');
      expect(result.normalized.finalized).toBe(false);
      expect(result.normalized.blockNumber).toBeNull();
    });

    it('returns finalized=false for transactions with < 6 confirmations', async () => {
      const mockTransaction = {
        txid: TEST_TXID,
        version: 2,
        vin: [
          {
            txid: 'prev_txid',
            vout: 0,
            sequence: 4294967295,
            addresses: [TEST_SENDER],
            value: '100000',
          },
        ],
        vout: [
          {
            value: '99000',
            n: 0,
            addresses: [TEST_RECIPIENT],
            isAddress: true,
          },
        ],
        blockHash: '00000000000000000002b5d3c5a8a9b8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2',
        blockHeight: 800000,
        confirmations: 3,
        blockTime: 1704067200,
        fees: '1000',
        size: 225,
        vsize: 140,
      };

      mockBlockbook.getTransaction.mockResolvedValueOnce(mockTransaction);

      const result = await fetcher.getTransaction(TEST_TXID);

      expect(result.normalized.status).toBe('confirmed');
      expect(result.normalized.finalized).toBe(false);
      expect(result.normalized.confirmations).toBe(3);
    });

    it('throws TransactionNotFoundError when transaction does not exist', async () => {
      mockBlockbook.getTransaction.mockResolvedValueOnce(null);

      await expect(fetcher.getTransaction(TEST_TXID)).rejects.toThrow(TransactionNotFoundError);
    });

    it('parses inputs and outputs as internal transactions', async () => {
      const mockTransaction = {
        txid: TEST_TXID,
        version: 2,
        vin: [
          {
            txid: 'prev_txid_1',
            vout: 0,
            sequence: 4294967295,
            addresses: [TEST_SENDER],
            value: '50000',
          },
          {
            txid: 'prev_txid_2',
            vout: 1,
            sequence: 4294967295,
            addresses: [TEST_SENDER],
            value: '50000',
          },
        ],
        vout: [
          {
            value: '80000',
            n: 0,
            addresses: [TEST_RECIPIENT],
            isAddress: true,
          },
          {
            value: '19000',
            n: 1,
            addresses: [TEST_SENDER],
            isAddress: true,
          },
        ],
        blockHash: '00000000000000000002b5d3c5a8a9b8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2',
        blockHeight: 800000,
        confirmations: 10,
        blockTime: 1704067200,
        fees: '1000',
        size: 400,
        vsize: 280,
      };

      mockBlockbook.getTransaction.mockResolvedValueOnce(mockTransaction);

      const result = await fetcher.getTransaction(TEST_TXID);

      // Should have 2 inputs + 2 outputs = 4 internal transactions
      expect(result.normalized.internalTransactions).toHaveLength(4);

      // Check inputs
      expect(result.normalized.internalTransactions[0]).toMatchObject({
        from: TEST_SENDER,
        to: null,
        value: '50000',
        type: 'utxo-input',
        traceIndex: 0,
      });
      expect(result.normalized.internalTransactions[1]).toMatchObject({
        from: TEST_SENDER,
        to: null,
        value: '50000',
        type: 'utxo-input',
        traceIndex: 1,
      });

      // Check outputs
      expect(result.normalized.internalTransactions[2]).toMatchObject({
        from: 'coinbase',
        to: TEST_RECIPIENT,
        value: '80000',
        type: 'utxo-output',
        traceIndex: 2,
      });
      expect(result.normalized.internalTransactions[3]).toMatchObject({
        from: 'coinbase',
        to: TEST_SENDER,
        value: '19000',
        type: 'utxo-output',
        traceIndex: 3,
      });

      expect(result.normalized.hasFullInternalData).toBe(true);
    });

    it('identifies largest input address as from', async () => {
      const mockTransaction = {
        txid: TEST_TXID,
        version: 2,
        vin: [
          {
            txid: 'prev_txid_1',
            vout: 0,
            sequence: 4294967295,
            addresses: ['small_input_address'],
            value: '10000',
          },
          {
            txid: 'prev_txid_2',
            vout: 1,
            sequence: 4294967295,
            addresses: ['large_input_address'],
            value: '90000',
          },
        ],
        vout: [
          {
            value: '99000',
            n: 0,
            addresses: [TEST_RECIPIENT],
            isAddress: true,
          },
        ],
        blockHash: '00000000000000000002b5d3c5a8a9b8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2',
        blockHeight: 800000,
        confirmations: 10,
        blockTime: 1704067200,
        fees: '1000',
        size: 225,
        vsize: 140,
      };

      mockBlockbook.getTransaction.mockResolvedValueOnce(mockTransaction);

      const result = await fetcher.getTransaction(TEST_TXID);

      expect(result.normalized.from).toBe('large_input_address');
    });

    it('has empty tokenTransfers for UTXO chains', async () => {
      const mockTransaction = {
        txid: TEST_TXID,
        version: 2,
        vin: [
          {
            txid: 'prev_txid',
            vout: 0,
            sequence: 4294967295,
            addresses: [TEST_SENDER],
            value: '100000',
          },
        ],
        vout: [
          {
            value: '99000',
            n: 0,
            addresses: [TEST_RECIPIENT],
            isAddress: true,
          },
        ],
        blockHash: '00000000000000000002b5d3c5a8a9b8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2',
        blockHeight: 800000,
        confirmations: 10,
        blockTime: 1704067200,
        fees: '1000',
        size: 225,
        vsize: 140,
      };

      mockBlockbook.getTransaction.mockResolvedValueOnce(mockTransaction);

      const result = await fetcher.getTransaction(TEST_TXID);

      expect(result.normalized.tokenTransfers).toEqual([]);
      expect(result.normalized.hasFullTokenData).toBe(true);
    });
  });
});
