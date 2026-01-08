import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetTransaction = vi.fn();

vi.mock('@solana/web3.js', () => ({
  Connection: vi.fn().mockImplementation(() => ({
    getTransaction: mockGetTransaction,
  })),
}));

import { SvmChainFetcher } from '@/src/services/transaction-processor/chain-fetcher/svm-fetcher.js';

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
    const result = await fetcher.fetch('solana', 'signature123');

    expect(result.type).toBe('svm');
    expect(result.signature).toBe('signature123');
    expect(result.slot).toBe(123456789);
    expect(result.fee).toBe('5000');
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

    const result = await fetcher.fetch('solana', 'signature123');

    expect(result.status).toBe('failed');
  });

  it('throws when transaction not found', async () => {
    mockGetTransaction.mockResolvedValue(null);

    await expect(
      fetcher.fetch('solana', 'notfound')
    ).rejects.toThrow('Transaction not found');
  });

  it('throws for unsupported chain', async () => {
    await expect(
      fetcher.fetch('unknown-chain' as ChainAlias, 'sig123')
    ).rejects.toThrow('Unsupported chain');
  });
});
