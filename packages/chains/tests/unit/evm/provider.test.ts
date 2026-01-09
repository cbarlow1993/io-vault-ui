// packages/chains/tests/unit/evm/provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvmChainProvider } from '../../../src/evm/provider.js';

// Valid test addresses (all lowercase for viem compatibility)
const TEST_SENDER = '0x742d35cc6634c0532925a3b844bc9e7595f88e26';
const TEST_RECIPIENT = '0x8ba1f109551bd432803012645ac136ddd64dba72';
const TEST_TOKEN_CONTRACT = '0xdac17f958d2ee523a2206206994597c13d831ec7'; // USDT

describe('EvmChainProvider', () => {
  let provider: EvmChainProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    provider = new EvmChainProvider('ethereum');
  });

  it('initializes with valid chain alias', () => {
    expect(provider.chainAlias).toBe('ethereum');
    expect(provider.config.chainId).toBe(1);
  });

  it('buildNativeTransfer creates correct transaction', async () => {
    // Mock nonce
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x5' }),
    });
    // Mock gas estimate
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 2, result: '0x5208' }),
    });
    // Mock fee data (block with baseFeePerGas)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 3,
        result: { baseFeePerGas: '0x2540be400' },
      }),
    });
    // Mock priority fee
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 4, result: '0x77359400' }),
    });

    const tx = await provider.buildNativeTransfer({
      from: TEST_SENDER,
      to: TEST_RECIPIENT,
      value: '1000000000000000000',
    });

    expect(tx.chainAlias).toBe('ethereum');
    expect(tx.raw).toBeDefined();
    expect(tx.raw.to).toBe(TEST_RECIPIENT);
    expect(tx.raw.value).toBe('1000000000000000000');
  });

  it('buildTokenTransfer includes ERC20 transfer data', async () => {
    // Mock nonce
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x0' }),
    });
    // Mock gas estimate
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 2, result: '0xea60' }),
    });
    // Mock fee data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 3,
        result: { baseFeePerGas: '0x2540be400' },
      }),
    });
    // Mock priority fee
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 4, result: '0x77359400' }),
    });

    const tx = await provider.buildTokenTransfer({
      from: TEST_SENDER,
      to: TEST_RECIPIENT,
      value: '1000000',
      contractAddress: TEST_TOKEN_CONTRACT,
    });

    expect(tx.chainAlias).toBe('ethereum');
    expect(tx.raw.to).toBe(TEST_TOKEN_CONTRACT);
    // ERC20 transfer selector: 0xa9059cbb
    expect(tx.raw.data.startsWith('0xa9059cbb')).toBe(true);
    expect(tx.raw.value).toBe('0');
  });

  it('decode returns normalised transaction', () => {
    const serialized = JSON.stringify({
      type: 2,
      chainId: 1,
      nonce: 0,
      to: '0xRecipient',
      value: '1000000000000000000',
      data: '0x',
      gasLimit: '21000',
      maxFeePerGas: '50000000000',
      maxPriorityFeePerGas: '2000000000',
    });

    const normalised = provider.decode(serialized, 'normalised');

    expect(normalised.chainAlias).toBe('ethereum');
    expect(normalised.type).toBe('native-transfer');
    expect(normalised.to).toBe('0xRecipient');
  });

  it('estimateFee returns fee estimate', async () => {
    // Mock block with baseFeePerGas
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: { baseFeePerGas: '0x2540be400' }, // 10 gwei
      }),
    });
    // Mock priority fee
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 2, result: '0x77359400' }), // 2 gwei
    });

    const estimate = await provider.estimateFee();

    expect(estimate.slow).toBeDefined();
    expect(estimate.standard).toBeDefined();
    expect(estimate.fast).toBeDefined();
    expect(typeof estimate.slow.fee).toBe('string');
    expect(typeof estimate.standard.fee).toBe('string');
    expect(typeof estimate.fast.fee).toBe('string');
    expect(typeof estimate.slow.formattedFee).toBe('string');
  });
});
