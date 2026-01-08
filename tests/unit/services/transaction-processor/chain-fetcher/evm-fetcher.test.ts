import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
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

import { EvmChainFetcher } from '@/src/services/transaction-processor/chain-fetcher/evm-fetcher.js';

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
    const result = await fetcher.fetch('eth' as ChainAlias, '0xabc123');

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

    const result = await fetcher.fetch('eth' as ChainAlias, '0xabc123');

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

    const result = await fetcher.fetch('eth' as ChainAlias, '0xabc123');

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0]!.address).toBe('0xtoken');
  });

  it('throws when transaction not found', async () => {
    mockGetTransaction.mockResolvedValue(null);

    await expect(
      fetcher.fetch('eth' as ChainAlias, '0xnotfound')
    ).rejects.toThrow('Transaction not found');
  });

  it('throws for unsupported chain', async () => {
    await expect(
      fetcher.fetch('unknown-chain' as ChainAlias, '0xabc123')
    ).rejects.toThrow('Unsupported chain');
  });
});
