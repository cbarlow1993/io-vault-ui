import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi } from 'vitest';
import { TransferEnricher } from '@/src/services/transactions/transfer-enricher.js';
import type {
  NativeTransfer,
  TokenTransferWithMetadata,
} from '@/src/repositories/types.js';

// Mock the Chain SDK
vi.mock('@iofinnet/io-core-dapp-utils-chains-sdk', () => ({
  Chain: {
    fromAlias: vi.fn().mockResolvedValue({
      Config: {
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
      },
    }),
  },
}));

describe('TransferEnricher', () => {
  const enricher = new TransferEnricher();
  const perspectiveAddress = '0xuser123';

  describe('enrichTransfers', () => {
    it('enriches native transfers with asset metadata', async () => {
      const nativeTransfers: NativeTransfer[] = [
        {
          id: 'native-1',
          txId: 'tx-1',
          chainAlias: 'eth' as ChainAlias,
          fromAddress: '0xsender',
          toAddress: '0xuser123',
          amount: '1000000000000000000', // 1 ETH
          metadata: null,
          createdAt: new Date(),
        },
      ];

      const result = await enricher.enrichTransfers(
        'eth' as ChainAlias,
        nativeTransfers,
        [],
        perspectiveAddress
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'native-1',
        transferType: 'native',
        direction: 'in',
        fromAddress: '0xsender',
        toAddress: '0xuser123',
        tokenAddress: null,
        amount: '1000000000000000000',
        formattedAmount: '1',
        displayAmount: '1 ETH',
        asset: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
          isVerified: true,
          isSpam: false,
        },
      });
    });

    it('enriches token transfers with metadata from tokens table', async () => {
      const tokenTransfers: TokenTransferWithMetadata[] = [
        {
          id: 'token-1',
          txId: 'tx-1',
          chainAlias: 'eth' as ChainAlias,
          tokenAddress: '0xusdc',
          fromAddress: '0xuser123',
          toAddress: '0xrecipient',
          amount: '1000000', // 1 USDC
          transferType: 'erc20',
          metadata: null,
          createdAt: new Date(),
          tokenName: 'USD Coin',
          tokenSymbol: 'USDC',
          tokenDecimals: 6,
          tokenLogoUri: 'https://example.com/usdc.png',
          tokenCoingeckoId: 'usd-coin',
          tokenIsVerified: true,
          tokenIsSpam: false,
        },
      ];

      const result = await enricher.enrichTransfers(
        'eth' as ChainAlias,
        [],
        tokenTransfers,
        perspectiveAddress
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'token-1',
        transferType: 'token',
        direction: 'out',
        fromAddress: '0xuser123',
        toAddress: '0xrecipient',
        tokenAddress: '0xusdc',
        amount: '1000000',
        formattedAmount: '1',
        displayAmount: '1 USDC',
        asset: {
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          logoUri: 'https://example.com/usdc.png',
          coingeckoId: 'usd-coin',
          isVerified: true,
          isSpam: false,
        },
      });
    });

    it('uses default metadata for tokens without metadata', async () => {
      const tokenTransfers: TokenTransferWithMetadata[] = [
        {
          id: 'token-1',
          txId: 'tx-1',
          chainAlias: 'eth' as ChainAlias,
          tokenAddress: '0xunknown',
          fromAddress: '0xsender',
          toAddress: '0xuser123',
          amount: '1000000000000000000',
          transferType: 'erc20',
          metadata: null,
          createdAt: new Date(),
          tokenName: null,
          tokenSymbol: null,
          tokenDecimals: null,
          tokenLogoUri: null,
          tokenCoingeckoId: null,
          tokenIsVerified: null,
          tokenIsSpam: null,
        },
      ];

      const result = await enricher.enrichTransfers(
        'eth' as ChainAlias,
        [],
        tokenTransfers,
        perspectiveAddress
      );

      expect(result[0]!.asset).toMatchObject({
        name: 'Unknown Token',
        symbol: 'TOKEN',
        decimals: 18,
        logoUri: null,
        coingeckoId: null,
        isVerified: false,
        isSpam: false,
      });
    });

    it('combines native and token transfers', async () => {
      const nativeTransfers: NativeTransfer[] = [
        {
          id: 'native-1',
          txId: 'tx-1',
          chainAlias: 'eth' as ChainAlias,
          fromAddress: '0xsender',
          toAddress: '0xuser123',
          amount: '500000000000000000', // 0.5 ETH
          metadata: null,
          createdAt: new Date(),
        },
      ];

      const tokenTransfers: TokenTransferWithMetadata[] = [
        {
          id: 'token-1',
          txId: 'tx-1',
          chainAlias: 'eth' as ChainAlias,
          tokenAddress: '0xusdc',
          fromAddress: '0xuser123',
          toAddress: '0xrecipient',
          amount: '100000000', // 100 USDC
          transferType: 'erc20',
          metadata: null,
          createdAt: new Date(),
          tokenName: 'USD Coin',
          tokenSymbol: 'USDC',
          tokenDecimals: 6,
          tokenLogoUri: null,
          tokenCoingeckoId: 'usd-coin',
          tokenIsVerified: true,
          tokenIsSpam: false,
        },
      ];

      const result = await enricher.enrichTransfers(
        'eth' as ChainAlias,
        nativeTransfers,
        tokenTransfers,
        perspectiveAddress
      );

      expect(result).toHaveLength(2);
      expect(result[0]!.transferType).toBe('native');
      expect(result[0]!.direction).toBe('in');
      expect(result[1]!.transferType).toBe('token');
      expect(result[1]!.direction).toBe('out');
    });

    it('normalizes addresses for direction calculation', async () => {
      const nativeTransfers: NativeTransfer[] = [
        {
          id: 'native-1',
          txId: 'tx-1',
          chainAlias: 'eth' as ChainAlias,
          fromAddress: '0xSENDER',
          toAddress: '0xUSER123', // uppercase
          amount: '1000000000000000000',
          metadata: null,
          createdAt: new Date(),
        },
      ];

      const result = await enricher.enrichTransfers(
        'eth' as ChainAlias,
        nativeTransfers,
        [],
        '0xuser123' // lowercase
      );

      expect(result[0]!.direction).toBe('in');
    });
  });

  describe('direction calculation', () => {
    it('returns "in" when toAddress matches perspective', async () => {
      const nativeTransfers: NativeTransfer[] = [
        {
          id: 'native-1',
          txId: 'tx-1',
          chainAlias: 'eth' as ChainAlias,
          fromAddress: '0xother',
          toAddress: '0xuser123',
          amount: '1000000000000000000',
          metadata: null,
          createdAt: new Date(),
        },
      ];

      const result = await enricher.enrichTransfers(
        'eth' as ChainAlias,
        nativeTransfers,
        [],
        '0xuser123'
      );

      expect(result[0]!.direction).toBe('in');
    });

    it('returns "out" when fromAddress matches perspective', async () => {
      const nativeTransfers: NativeTransfer[] = [
        {
          id: 'native-1',
          txId: 'tx-1',
          chainAlias: 'eth' as ChainAlias,
          fromAddress: '0xuser123',
          toAddress: '0xother',
          amount: '1000000000000000000',
          metadata: null,
          createdAt: new Date(),
        },
      ];

      const result = await enricher.enrichTransfers(
        'eth' as ChainAlias,
        nativeTransfers,
        [],
        '0xuser123'
      );

      expect(result[0]!.direction).toBe('out');
    });

    it('defaults to "out" when neither address matches', async () => {
      const nativeTransfers: NativeTransfer[] = [
        {
          id: 'native-1',
          txId: 'tx-1',
          chainAlias: 'eth' as ChainAlias,
          fromAddress: '0xother1',
          toAddress: '0xother2',
          amount: '1000000000000000000',
          metadata: null,
          createdAt: new Date(),
        },
      ];

      const result = await enricher.enrichTransfers(
        'eth' as ChainAlias,
        nativeTransfers,
        [],
        '0xuser123'
      );

      expect(result[0]!.direction).toBe('out');
    });
  });
});
