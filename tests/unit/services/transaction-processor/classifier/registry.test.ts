import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClassifyOptions, RawTransaction } from '@/src/services/transaction-processor/types.js';

const { mockEvmClassifier, mockSvmClassifier, mockNovesClassifier } = vi.hoisted(() => ({
  mockEvmClassifier: { classify: vi.fn() },
  mockSvmClassifier: { classify: vi.fn() },
  mockNovesClassifier: { classify: vi.fn() },
}));

vi.mock('@/src/services/transaction-processor/classifier/evm-classifier.js', () => ({
  EvmClassifier: vi.fn().mockImplementation(() => mockEvmClassifier),
}));

vi.mock('@/src/services/transaction-processor/classifier/svm-classifier.js', () => ({
  SvmClassifier: vi.fn().mockImplementation(() => mockSvmClassifier),
}));

vi.mock('@/src/services/transaction-processor/classifier/noves-classifier.js', () => ({
  NovesClassifier: vi.fn().mockImplementation(() => mockNovesClassifier),
}));

import { ClassifierRegistry } from '@/src/services/transaction-processor/classifier/index.js';

describe('ClassifierRegistry', () => {
  let registry: ClassifierRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ClassifierRegistry({ novesApiKey: 'test-key' });
  });

  const evmTx: RawTransaction = {
    type: 'evm', hash: '0x123', from: '0xsender', to: '0xrecipient',
    value: '0', input: '0x', gasUsed: '21000', gasPrice: '20000000000',
    logs: [], blockNumber: 12345678, blockHash: '0xblockhash',
    timestamp: new Date(), status: 'success',
  };

  const options: ClassifyOptions = { perspectiveAddress: '0xsender' };

  it('uses custom classifier result when confident', async () => {
    mockEvmClassifier.classify.mockResolvedValue({
      type: 'transfer', direction: 'out', confidence: 'high', source: 'custom', label: 'Token Transfer', transfers: [],
    });
    const result = await registry.classify(evmTx, options);
    expect(result.type).toBe('transfer');
    expect(result.source).toBe('custom');
    expect(mockNovesClassifier.classify).not.toHaveBeenCalled();
  });

  it('falls back to Noves when custom returns unknown', async () => {
    mockEvmClassifier.classify.mockResolvedValue({
      type: 'unknown', direction: 'neutral', confidence: 'low', source: 'custom', label: 'Unknown', transfers: [],
    });
    mockNovesClassifier.classify.mockResolvedValue({
      type: 'swap', direction: 'out', confidence: 'high', source: 'noves', label: 'Swap on Uniswap', transfers: [],
    });
    const result = await registry.classify(evmTx, options);
    expect(result.type).toBe('swap');
    expect(result.source).toBe('noves');
  });

  it('falls back to Noves when custom has low confidence', async () => {
    mockEvmClassifier.classify.mockResolvedValue({
      type: 'transfer', direction: 'out', confidence: 'low', source: 'custom', label: 'Maybe Transfer', transfers: [],
    });
    mockNovesClassifier.classify.mockResolvedValue({
      type: 'bridge', direction: 'out', confidence: 'high', source: 'noves', label: 'Bridge Transaction', transfers: [],
    });
    const result = await registry.classify(evmTx, options);
    expect(result.type).toBe('bridge');
    expect(result.source).toBe('noves');
  });

  it('keeps custom result if Noves also returns unknown', async () => {
    mockEvmClassifier.classify.mockResolvedValue({
      type: 'unknown', direction: 'neutral', confidence: 'low', source: 'custom', label: 'Unknown',
      transfers: [{ type: 'token', direction: 'out', from: '', to: '', amount: '100' }],
    });
    mockNovesClassifier.classify.mockResolvedValue({
      type: 'unknown', direction: 'neutral', confidence: 'low', source: 'noves', label: 'Unknown', transfers: [],
    });
    const result = await registry.classify(evmTx, options);
    expect(result.type).toBe('unknown');
    expect(result.transfers).toHaveLength(1);
  });
});
