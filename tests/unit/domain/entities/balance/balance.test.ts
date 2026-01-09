import { describe, expect, it } from 'vitest';
import { Balance, Token, SpamAnalysis, InvalidBalanceError } from '@/src/domain/entities/index.js';
import type { TokenPrice, NativeAsset } from '@/src/domain/entities/balance/balance.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

describe('Balance', () => {
  const chainAlias = 'ethereum' as ChainAlias;

  const createPrice = (price: number, priceChange24h: number | null = null): TokenPrice => ({
    price,
    priceChange24h,
    updatedAt: new Date(),
    isStale: false,
  });

  const createNativeAsset = (overrides: Partial<NativeAsset> = {}): NativeAsset => ({
    chainAlias,
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    coingeckoId: 'ethereum',
    ...overrides,
  });

  describe('create', () => {
    it('creates a Balance entity with required fields', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        isNative: false,
        balance: '1000000',
        decimals: 6,
        name: 'USD Coin',
        symbol: 'USDC',
      });

      expect(balance.id).toBe('balance-123');
      expect(balance.addressId).toBe('addr-456');
      expect(balance.symbol).toBe('USDC');
      expect(balance.rawBalance).toBe('1000000');
      expect(balance.formattedBalance).toBe('1');
    });

    it('creates a native balance', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      });

      expect(balance.isNative).toBe(true);
      expect(balance.tokenAddress.isNative).toBe(true);
    });

    it('throws for invalid decimals', () => {
      expect(() =>
        Balance.create({
          id: 'balance-123',
          addressId: 'addr-456',
          chainAlias,
          tokenAddress: null,
          isNative: true,
          balance: '1',
          decimals: -1,
          name: 'Test',
          symbol: 'TST',
        })
      ).toThrow(InvalidBalanceError);
    });
  });

  describe('native', () => {
    it('creates a native currency balance', () => {
      const balance = Balance.native(
        'balance-123',
        'addr-456',
        chainAlias,
        '2000000000000000000',
        createNativeAsset(),
        createPrice(3000)
      );

      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('ETH');
      expect(balance.formattedBalance).toBe('2');
      expect(balance.usdValue).toBe(6000);
    });
  });

  describe('fromToken', () => {
    it('creates balance from Token entity', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'Test Token',
        symbol: 'TST',
        decimals: 18,
        logoUri: 'https://example.com/logo.png',
        coingeckoId: 'test-token',
        isVerified: true,
      });

      const balance = Balance.fromToken(
        'balance-123',
        'addr-456',
        token,
        '1000000000000000000',
        null,
        createPrice(10)
      );

      expect(balance.symbol).toBe('TST');
      expect(balance.name).toBe('Test Token');
      expect(balance.logoUri).toBe('https://example.com/logo.png');
      expect(balance.coingeckoId).toBe('test-token');
      expect(balance.isVerified).toBe(true);
      expect(balance.usdValue).toBe(10);
    });
  });

  describe('usdPrice / usdValue', () => {
    it('returns price when set', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
        price: createPrice(3000),
      });

      expect(balance.usdPrice).toBe(3000);
      expect(balance.usdValue).toBe(3000);
    });

    it('returns null when no price', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      });

      expect(balance.usdPrice).toBeNull();
      expect(balance.usdValue).toBeNull();
    });

    it('calculates value correctly for multiple tokens', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: '0xabc',
        isNative: false,
        balance: '5000000',
        decimals: 6,
        name: 'USDC',
        symbol: 'USDC',
        price: createPrice(1),
      });

      expect(balance.usdValue).toBe(5);
    });
  });

  describe('priceChange24h / isPriceStale', () => {
    it('returns price change when available', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        name: 'ETH',
        symbol: 'ETH',
        price: createPrice(3000, 5.5),
      });

      expect(balance.priceChange24h).toBe(5.5);
    });

    it('returns stale status', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: null,
        isNative: true,
        balance: '1',
        decimals: 18,
        name: 'ETH',
        symbol: 'ETH',
        price: {
          price: 3000,
          priceChange24h: null,
          updatedAt: new Date(),
          isStale: true,
        },
      });

      expect(balance.isPriceStale).toBe(true);
    });
  });

  describe('isSpam / userSpamOverride', () => {
    it('returns spam status from analysis', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: '0xabc',
        isNative: false,
        balance: '1',
        decimals: 18,
        name: 'Scam',
        symbol: 'SCAM',
        spamAnalysis: SpamAnalysis.spam(),
      });

      expect(balance.isSpam).toBe(true);
      expect(balance.userSpamOverride).toBe('spam');
    });

    it('returns trusted status', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: '0xabc',
        isNative: false,
        balance: '1',
        decimals: 18,
        name: 'Token',
        symbol: 'TKN',
        spamAnalysis: SpamAnalysis.trusted(),
      });

      expect(balance.isSpam).toBe(false);
      expect(balance.userSpamOverride).toBe('trusted');
    });
  });

  describe('visibility', () => {
    it('defaults to visible', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: null,
        isNative: true,
        balance: '1',
        decimals: 18,
        name: 'ETH',
        symbol: 'ETH',
      });

      expect(balance.isVisible).toBe(true);
      expect(balance.isHidden).toBe(false);
    });

    it('can be set to hidden', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: null,
        isNative: true,
        balance: '1',
        decimals: 18,
        name: 'ETH',
        symbol: 'ETH',
        visibility: 'hidden',
      });

      expect(balance.isHidden).toBe(true);
    });
  });

  describe('shouldDisplay', () => {
    it('returns false when hidden', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: null,
        isNative: true,
        balance: '1',
        decimals: 18,
        name: 'ETH',
        symbol: 'ETH',
        visibility: 'hidden',
      });

      expect(balance.shouldDisplay(false)).toBe(false);
      expect(balance.shouldDisplay(true)).toBe(false);
    });

    it('returns true for spam when showSpam is true', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: '0xabc',
        isNative: false,
        balance: '1',
        decimals: 18,
        name: 'Spam',
        symbol: 'SPAM',
        spamAnalysis: SpamAnalysis.spam(),
      });

      expect(balance.shouldDisplay(true)).toBe(true);
      expect(balance.shouldDisplay(false)).toBe(false);
    });

    it('returns true for non-spam tokens', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: '0xabc',
        isNative: false,
        balance: '1',
        decimals: 18,
        name: 'Token',
        symbol: 'TKN',
      });

      expect(balance.shouldDisplay(false)).toBe(true);
    });
  });

  describe('withVisibility', () => {
    it('creates new balance with updated visibility', () => {
      const original = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: null,
        isNative: true,
        balance: '1',
        decimals: 18,
        name: 'ETH',
        symbol: 'ETH',
      });

      const hidden = original.withVisibility('hidden');

      expect(hidden.isHidden).toBe(true);
      expect(original.isVisible).toBe(true);
    });
  });

  describe('withUserOverride', () => {
    it('creates new balance with updated spam override', () => {
      const original = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: '0xabc',
        isNative: false,
        balance: '1',
        decimals: 18,
        name: 'Token',
        symbol: 'TKN',
      });

      const markedSpam = original.withUserOverride('spam');

      expect(markedSpam.isSpam).toBe(true);
      expect(original.isSpam).toBe(false);
    });
  });

  describe('withPrice', () => {
    it('creates new balance with updated price', () => {
      const original = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        name: 'ETH',
        symbol: 'ETH',
      });

      const withPrice = original.withPrice(createPrice(3500));

      expect(withPrice.usdPrice).toBe(3500);
      expect(withPrice.usdValue).toBe(3500);
      expect(original.usdPrice).toBeNull();
    });
  });

  describe('equals', () => {
    it('returns true for same id', () => {
      const a = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: null,
        isNative: true,
        balance: '1',
        decimals: 18,
        name: 'ETH',
        symbol: 'ETH',
      });

      const b = Balance.create({
        id: 'balance-123',
        addressId: 'addr-789',
        chainAlias,
        tokenAddress: '0xabc',
        isNative: false,
        balance: '2',
        decimals: 6,
        name: 'Other',
        symbol: 'OTH',
      });

      expect(a.equals(b)).toBe(true);
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: null,
        isNative: true,
        balance: '1',
        decimals: 18,
        name: 'ETH',
        symbol: 'ETH',
      });

      expect(Object.isFrozen(balance)).toBe(true);
    });
  });

  describe('toEnrichedBalance', () => {
    it('converts to DTO format', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: '0xabc',
        isNative: false,
        balance: '1000000',
        decimals: 6,
        name: 'USDC',
        symbol: 'USDC',
        logoUri: 'https://example.com/logo.png',
        coingeckoId: 'usd-coin',
        price: createPrice(1),
      });

      const dto = balance.toEnrichedBalance();

      expect(dto).toMatchObject({
        tokenAddress: '0xabc',
        isNative: false,
        symbol: 'USDC',
        name: 'USDC',
        decimals: 6,
        balance: '1000000',
        formattedBalance: '1',
        usdPrice: 1,
        usdValue: 1,
        logoUri: 'https://example.com/logo.png',
        coingeckoId: 'usd-coin',
      });
    });
  });

  describe('toJSON', () => {
    it('serializes correctly', () => {
      const balance = Balance.create({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias,
        tokenAddress: null,
        isNative: true,
        balance: '1000000000000000000',
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      });

      const json = balance.toJSON();

      expect(json).toMatchObject({
        id: 'balance-123',
        addressId: 'addr-456',
        chainAlias: 'ethereum',
        isNative: true,
        name: 'Ethereum',
        symbol: 'ETH',
        formattedBalance: '1',
      });
    });
  });
});
