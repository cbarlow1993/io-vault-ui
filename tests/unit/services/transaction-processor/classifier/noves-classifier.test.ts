import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetTransaction } = vi.hoisted(() => ({
  mockGetTransaction: vi.fn(),
}));

vi.mock('@noves/noves-sdk', () => ({
  Translate: {
    evm: vi.fn().mockReturnValue({
      getTransaction: mockGetTransaction,
    }),
  },
}));

import { NovesClassifier } from '@/src/services/transaction-processor/classifier/noves-classifier.js';
import type { EvmTransactionData, ClassifyOptions } from '@/src/services/transaction-processor/types.js';

describe('NovesClassifier', () => {
  let classifier: NovesClassifier;
  const defaultOptions: ClassifyOptions = { perspectiveAddress: '0xsender', chainAlias: 'eth' as ChainAlias };

  beforeEach(() => {
    vi.clearAllMocks();
    classifier = new NovesClassifier({ apiKey: 'test-key' });
  });

  const baseTx: EvmTransactionData = {
    type: 'evm',
    hash: '0xabc123',
    from: '0xsender',
    to: '0xrecipient',
    value: '0',
    input: '0x',
    gasUsed: '21000',
    gasPrice: '20000000000',
    logs: [],
    blockNumber: 12345678,
    blockHash: '0xblockhash',
    timestamp: new Date(),
    status: 'success',
  };

  it('maps Noves classification to our format', async () => {
    mockGetTransaction.mockResolvedValue({
      classificationData: {
        type: 'swap',
        description: 'Swapped 1 ETH for 2000 USDC on Uniswap',
      },
      transfers: [
        { action: 'sent', from: { address: '0xsender' }, to: { address: '0xpool' }, amount: '1000000000000000000', token: { address: '0x0', symbol: 'ETH', decimals: 18 } },
        { action: 'received', from: { address: '0xpool' }, to: { address: '0xsender' }, amount: '2000000000', token: { address: '0xusdc', symbol: 'USDC', decimals: 6 } },
      ],
    });

    const result = await classifier.classify(baseTx, defaultOptions);

    expect(result.type).toBe('swap');
    expect(result.direction).toBe('neutral');
    expect(result.source).toBe('noves');
    expect(result.label).toBe('Swapped 1 ETH for 2000 USDC on Uniswap');
    expect(result.transfers).toHaveLength(2);
  });

  it('returns unknown when Noves returns no classification', async () => {
    mockGetTransaction.mockResolvedValue({
      classificationData: { type: 'unknown', description: 'Unknown transaction' },
      transfers: [],
    });
    const result = await classifier.classify(baseTx, defaultOptions);
    expect(result.type).toBe('unknown');
    expect(result.direction).toBe('neutral');
    expect(result.confidence).toBe('low');
  });

  it('handles Noves API errors gracefully', async () => {
    mockGetTransaction.mockRejectedValue(new Error('API error'));
    const result = await classifier.classify(baseTx, defaultOptions);
    expect(result.type).toBe('unknown');
    expect(result.direction).toBe('neutral');
    expect(result.confidence).toBe('low');
  });

  describe('direction handling', () => {
    it('preserves direction from Noves for receive type', async () => {
      mockGetTransaction.mockResolvedValue({
        classificationData: { type: 'receive', description: 'Received tokens' },
        transfers: [
          { action: 'received', from: { address: '0xother' }, to: { address: '0xsender' }, amount: '1000', token: { address: '0xtoken', symbol: 'TKN', decimals: 18 } },
        ],
      });

      const result = await classifier.classify(baseTx, defaultOptions);

      expect(result.type).toBe('transfer');
      expect(result.direction).toBe('in');
    });

    it('preserves direction from Noves for send type', async () => {
      mockGetTransaction.mockResolvedValue({
        classificationData: { type: 'send', description: 'Sent tokens' },
        transfers: [
          { action: 'sent', from: { address: '0xsender' }, to: { address: '0xother' }, amount: '1000', token: { address: '0xtoken', symbol: 'TKN', decimals: 18 } },
        ],
      });

      const result = await classifier.classify(baseTx, defaultOptions);

      expect(result.type).toBe('transfer');
      expect(result.direction).toBe('out');
    });

    it('preserves direction from Noves for stake type', async () => {
      mockGetTransaction.mockResolvedValue({
        classificationData: { type: 'stake', description: 'Staked tokens' },
        transfers: [],
      });

      const result = await classifier.classify(baseTx, defaultOptions);

      expect(result.type).toBe('stake');
      expect(result.direction).toBe('out');
    });

    it('preserves direction from Noves for unstake type', async () => {
      mockGetTransaction.mockResolvedValue({
        classificationData: { type: 'unstake', description: 'Unstaked tokens' },
        transfers: [],
      });

      const result = await classifier.classify(baseTx, defaultOptions);

      expect(result.type).toBe('stake');
      expect(result.direction).toBe('in');
    });

    it('calculates direction for neutral transfer type based on transfers', async () => {
      mockGetTransaction.mockResolvedValue({
        classificationData: { type: 'transfer', description: 'Transferred tokens' },
        transfers: [
          { action: 'received', from: { address: '0xother' }, to: { address: '0xsender' }, amount: '1000', token: { address: '0xtoken', symbol: 'TKN', decimals: 18 } },
        ],
      });

      const result = await classifier.classify(baseTx, defaultOptions);

      expect(result.type).toBe('transfer');
      expect(result.direction).toBe('in');
    });

    it('preserves direction from Noves for nft_receive type', async () => {
      mockGetTransaction.mockResolvedValue({
        classificationData: { type: 'nft_receive', description: 'Received NFT' },
        transfers: [],
      });

      const result = await classifier.classify(baseTx, defaultOptions);

      expect(result.type).toBe('nft_transfer');
      expect(result.direction).toBe('in');
    });

    it('preserves direction from Noves for nft_send type', async () => {
      mockGetTransaction.mockResolvedValue({
        classificationData: { type: 'nft_send', description: 'Sent NFT' },
        transfers: [],
      });

      const result = await classifier.classify(baseTx, defaultOptions);

      expect(result.type).toBe('nft_transfer');
      expect(result.direction).toBe('out');
    });

    it('uses direction in for mint type', async () => {
      mockGetTransaction.mockResolvedValue({
        classificationData: { type: 'mint', description: 'Minted tokens' },
        transfers: [],
      });

      const result = await classifier.classify(baseTx, defaultOptions);

      expect(result.type).toBe('mint');
      expect(result.direction).toBe('in');
    });

    it('uses direction out for burn type', async () => {
      mockGetTransaction.mockResolvedValue({
        classificationData: { type: 'burn', description: 'Burned tokens' },
        transfers: [],
      });

      const result = await classifier.classify(baseTx, defaultOptions);

      expect(result.type).toBe('burn');
      expect(result.direction).toBe('out');
    });
  });
});
