import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvmChainAliases, SvmChainAliases } from '@iofinnet/io-core-dapp-utils-chains-sdk';

vi.mock('@/src/services/transaction-processor/chain-fetcher/evm-fetcher.js', () => ({
  EvmChainFetcher: vi.fn().mockImplementation(() => ({
    fetch: vi.fn().mockResolvedValue({ type: 'evm', hash: '0x123' }),
  })),
}));

vi.mock('@/src/services/transaction-processor/chain-fetcher/svm-fetcher.js', () => ({
  SvmChainFetcher: vi.fn().mockImplementation(() => ({
    fetch: vi.fn().mockResolvedValue({ type: 'svm', signature: 'sig123' }),
  })),
}));

import { ChainFetcherRegistry } from '@/src/services/transaction-processor/chain-fetcher/index.js';

describe('ChainFetcherRegistry', () => {
  let registry: ChainFetcherRegistry;
  const ethAlias = EvmChainAliases.ETH; // 'eth'
  const solanaAlias = SvmChainAliases.SOLANA; // 'solana'

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ChainFetcherRegistry({
      evmRpcUrls: { [ethAlias]: 'https://eth.example.com' },
      svmRpcUrls: { [solanaAlias]: 'https://solana.example.com' },
    });
  });

  it('routes EVM chains to EVM fetcher', async () => {
    const result = await registry.fetch(ethAlias, '0x123');
    expect(result.type).toBe('evm');
  });

  it('routes SVM chains to SVM fetcher', async () => {
    const result = await registry.fetch(solanaAlias, 'sig123');
    expect(result.type).toBe('svm');
  });

  it('throws for unknown chain', async () => {
    await expect(
      registry.fetch('unknown-chain' as ChainAlias, 'hash')
    ).rejects.toThrow('No fetcher found for chain');
  });
});
