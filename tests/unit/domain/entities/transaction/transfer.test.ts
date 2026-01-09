import { describe, expect, it } from 'vitest';
import { Transfer, type CreateTransferData } from '@/src/domain/entities/transaction/transfer.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

describe('Transfer', () => {
  const chainAlias = 'ethereum' as ChainAlias;
  const senderAddress = '0x1234567890123456789012345678901234567890';
  const receiverAddress = '0x0987654321098765432109876543210987654321';
  const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

  describe('create', () => {
    it('creates a native transfer', () => {
      const data: CreateTransferData = {
        type: 'native',
        chainAlias,
        from: senderAddress,
        to: receiverAddress,
        amount: '1000000000000000000',
        decimals: 18,
        tokenName: 'Ethereum',
        tokenSymbol: 'ETH',
      };

      const transfer = Transfer.create(data);

      expect(transfer.type).toBe('native');
      expect(transfer.isNative).toBe(true);
      expect(transfer.from?.normalized).toBe(senderAddress.toLowerCase());
      expect(transfer.to?.normalized).toBe(receiverAddress.toLowerCase());
      expect(transfer.formattedAmount).toBe('1');
      expect(transfer.symbol).toBe('ETH');
      expect(transfer.name).toBe('Ethereum');
    });

    it('creates a token transfer', () => {
      const data: CreateTransferData = {
        type: 'token',
        chainAlias,
        from: senderAddress,
        to: receiverAddress,
        amount: '1000000',
        decimals: 6,
        tokenAddress,
        tokenName: 'USD Coin',
        tokenSymbol: 'USDC',
        logoUri: 'https://example.com/usdc.png',
        coingeckoId: 'usd-coin',
        isVerified: true,
      };

      const transfer = Transfer.create(data);

      expect(transfer.type).toBe('token');
      expect(transfer.isToken).toBe(true);
      expect(transfer.formattedAmount).toBe('1');
      expect(transfer.symbol).toBe('USDC');
      expect(transfer.asset.logoUri).toBe('https://example.com/usdc.png');
      expect(transfer.asset.coingeckoId).toBe('usd-coin');
      expect(transfer.asset.isVerified).toBe(true);
    });

    it('creates an NFT transfer', () => {
      const data: CreateTransferData = {
        type: 'nft',
        chainAlias,
        from: senderAddress,
        to: receiverAddress,
        amount: '1',
        decimals: 0,
        tokenAddress,
        tokenName: 'Bored Ape',
        tokenSymbol: 'BAYC',
        tokenId: '1234',
      };

      const transfer = Transfer.create(data);

      expect(transfer.type).toBe('nft');
      expect(transfer.isNft).toBe(true);
      expect(transfer.tokenId).toBe('1234');
      expect(transfer.symbol).toBe('BAYC');
    });

    it('handles null addresses', () => {
      const data: CreateTransferData = {
        type: 'token',
        chainAlias,
        from: null,
        to: receiverAddress,
        amount: '1000000',
        decimals: 6,
        tokenAddress,
        tokenName: 'USDC',
        tokenSymbol: 'USDC',
      };

      const transfer = Transfer.create(data);

      expect(transfer.from).toBeNull();
      expect(transfer.to?.normalized).toBe(receiverAddress.toLowerCase());
    });

    it('sets default values for optional fields', () => {
      const data: CreateTransferData = {
        type: 'token',
        chainAlias,
        from: senderAddress,
        to: receiverAddress,
        amount: '1000000',
        decimals: 6,
        tokenAddress,
      };

      const transfer = Transfer.create(data);

      expect(transfer.asset.name).toBe('');
      expect(transfer.asset.symbol).toBe('');
      expect(transfer.asset.logoUri).toBeNull();
      expect(transfer.asset.coingeckoId).toBeNull();
      expect(transfer.asset.isVerified).toBe(false);
      expect(transfer.asset.isSpam).toBe(false);
    });
  });

  describe('native', () => {
    it('creates a native currency transfer', () => {
      const transfer = Transfer.native(chainAlias, senderAddress, receiverAddress, '2000000000000000000', {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        coingeckoId: 'ethereum',
      });

      expect(transfer.isNative).toBe(true);
      expect(transfer.symbol).toBe('ETH');
      expect(transfer.formattedAmount).toBe('2');
      expect(transfer.asset.coingeckoId).toBe('ethereum');
      expect(transfer.asset.isVerified).toBe(true);
    });

    it('creates native transfer without coingeckoId', () => {
      const transfer = Transfer.native(chainAlias, senderAddress, receiverAddress, '1000000000000000000', {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      });

      expect(transfer.asset.coingeckoId).toBeNull();
    });
  });

  describe('token', () => {
    it('creates a token transfer', () => {
      const transfer = Transfer.token(chainAlias, senderAddress, receiverAddress, '5000000', {
        address: tokenAddress,
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoUri: 'https://example.com/usdc.png',
        isVerified: true,
      });

      expect(transfer.isToken).toBe(true);
      expect(transfer.symbol).toBe('USDC');
      expect(transfer.formattedAmount).toBe('5');
      expect(transfer.asset.address.normalized).toBe(tokenAddress.toLowerCase());
    });

    it('creates token transfer with spam flag', () => {
      const transfer = Transfer.token(chainAlias, senderAddress, receiverAddress, '1000000', {
        address: tokenAddress,
        name: 'Scam Token',
        symbol: 'SCAM',
        decimals: 6,
        isSpam: true,
      });

      expect(transfer.asset.isSpam).toBe(true);
    });
  });

  describe('nft', () => {
    it('creates an NFT transfer', () => {
      const transfer = Transfer.nft(chainAlias, senderAddress, receiverAddress, {
        address: tokenAddress,
        name: 'CryptoPunks',
        symbol: 'PUNK',
        tokenId: '7804',
        logoUri: 'https://example.com/punk.png',
        isVerified: true,
      });

      expect(transfer.isNft).toBe(true);
      expect(transfer.tokenId).toBe('7804');
      expect(transfer.formattedAmount).toBe('1');
      expect(transfer.displayAmount).toBe('1 PUNK');
    });
  });

  describe('computed properties', () => {
    const nativeTransfer = Transfer.native(chainAlias, senderAddress, receiverAddress, '1000000000000000000', {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    });

    const tokenTransfer = Transfer.token(chainAlias, senderAddress, receiverAddress, '1000000', {
      address: tokenAddress,
      name: 'USDC',
      symbol: 'USDC',
      decimals: 6,
    });

    const nftTransfer = Transfer.nft(chainAlias, senderAddress, receiverAddress, {
      address: tokenAddress,
      name: 'NFT',
      symbol: 'NFT',
      tokenId: '1',
    });

    it('isNative returns correct value', () => {
      expect(nativeTransfer.isNative).toBe(true);
      expect(tokenTransfer.isNative).toBe(false);
      expect(nftTransfer.isNative).toBe(false);
    });

    it('isToken returns correct value', () => {
      expect(nativeTransfer.isToken).toBe(false);
      expect(tokenTransfer.isToken).toBe(true);
      expect(nftTransfer.isToken).toBe(false);
    });

    it('isNft returns correct value', () => {
      expect(nativeTransfer.isNft).toBe(false);
      expect(tokenTransfer.isNft).toBe(false);
      expect(nftTransfer.isNft).toBe(true);
    });

    it('chainAlias returns asset chain', () => {
      expect(nativeTransfer.chainAlias).toBe('ethereum');
    });

    it('symbol returns asset symbol', () => {
      expect(nativeTransfer.symbol).toBe('ETH');
      expect(tokenTransfer.symbol).toBe('USDC');
    });

    it('name returns asset name', () => {
      expect(nativeTransfer.name).toBe('Ethereum');
    });

    it('decimals returns asset decimals', () => {
      expect(nativeTransfer.decimals).toBe(18);
      expect(tokenTransfer.decimals).toBe(6);
    });

    it('formattedAmount returns formatted value', () => {
      expect(nativeTransfer.formattedAmount).toBe('1');
      expect(tokenTransfer.formattedAmount).toBe('1');
    });

    it('displayAmount formats amount with symbol', () => {
      expect(nativeTransfer.displayAmount).toBe('1 ETH');
      expect(tokenTransfer.displayAmount).toBe('1 USDC');
    });

    it('displayAmount shows 1 for NFT regardless of amount', () => {
      expect(nftTransfer.displayAmount).toBe('1 NFT');
    });
  });

  describe('getDirection', () => {
    const transfer = Transfer.native(chainAlias, senderAddress, receiverAddress, '1000000000000000000', {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    });

    it('returns out when address is sender', () => {
      const perspective = WalletAddress.create(senderAddress, chainAlias);
      expect(transfer.getDirection(perspective)).toBe('out');
    });

    it('returns in when address is receiver', () => {
      const perspective = WalletAddress.create(receiverAddress, chainAlias);
      expect(transfer.getDirection(perspective)).toBe('in');
    });

    it('returns null when address is not involved', () => {
      const perspective = WalletAddress.create('0x1111111111111111111111111111111111111111', chainAlias);
      expect(transfer.getDirection(perspective)).toBeNull();
    });

    it('returns out for self-transfer', () => {
      const selfTransfer = Transfer.native(chainAlias, senderAddress, senderAddress, '1000000000000000000', {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      });
      const perspective = WalletAddress.create(senderAddress, chainAlias);

      expect(selfTransfer.getDirection(perspective)).toBe('out');
    });
  });

  describe('involves', () => {
    const transfer = Transfer.native(chainAlias, senderAddress, receiverAddress, '1000000000000000000', {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    });

    it('returns true when address is sender', () => {
      const address = WalletAddress.create(senderAddress, chainAlias);
      expect(transfer.involves(address)).toBe(true);
    });

    it('returns true when address is receiver', () => {
      const address = WalletAddress.create(receiverAddress, chainAlias);
      expect(transfer.involves(address)).toBe(true);
    });

    it('returns false when address is not involved', () => {
      const address = WalletAddress.create('0x1111111111111111111111111111111111111111', chainAlias);
      expect(transfer.involves(address)).toBe(false);
    });
  });

  describe('isFrom / isTo', () => {
    const transfer = Transfer.native(chainAlias, senderAddress, receiverAddress, '1000000000000000000', {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    });

    it('isFrom returns true for sender', () => {
      const address = WalletAddress.create(senderAddress, chainAlias);
      expect(transfer.isFrom(address)).toBe(true);
    });

    it('isFrom returns false for non-sender', () => {
      const address = WalletAddress.create(receiverAddress, chainAlias);
      expect(transfer.isFrom(address)).toBe(false);
    });

    it('isTo returns true for receiver', () => {
      const address = WalletAddress.create(receiverAddress, chainAlias);
      expect(transfer.isTo(address)).toBe(true);
    });

    it('isTo returns false for non-receiver', () => {
      const address = WalletAddress.create(senderAddress, chainAlias);
      expect(transfer.isTo(address)).toBe(false);
    });
  });

  describe('equals', () => {
    it('returns true for identical transfers', () => {
      const a = Transfer.native(chainAlias, senderAddress, receiverAddress, '1000000000000000000', {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      });
      const b = Transfer.native(chainAlias, senderAddress, receiverAddress, '1000000000000000000', {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      });

      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different amounts', () => {
      const a = Transfer.native(chainAlias, senderAddress, receiverAddress, '1000000000000000000', {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      });
      const b = Transfer.native(chainAlias, senderAddress, receiverAddress, '2000000000000000000', {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      });

      expect(a.equals(b)).toBe(false);
    });

    it('returns false for different types', () => {
      const native = Transfer.native(chainAlias, senderAddress, receiverAddress, '1', {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
      });
      const token = Transfer.token(chainAlias, senderAddress, receiverAddress, '1', {
        address: tokenAddress,
        name: 'Token',
        symbol: 'TKN',
        decimals: 18,
      });

      expect(native.equals(token)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const transfer = Transfer.native(chainAlias, senderAddress, receiverAddress, '1000000000000000000', {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      });

      expect(Object.isFrozen(transfer)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('serializes native transfer correctly', () => {
      const transfer = Transfer.native(chainAlias, senderAddress, receiverAddress, '1000000000000000000', {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        coingeckoId: 'ethereum',
      });

      const json = transfer.toJSON();

      expect(json).toMatchObject({
        type: 'native',
        from: senderAddress.toLowerCase(),
        to: receiverAddress.toLowerCase(),
        amount: '1000000000000000000',
        formattedAmount: '1',
        displayAmount: '1 ETH',
        tokenId: null,
        asset: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
          coingeckoId: 'ethereum',
          isVerified: true,
          isSpam: false,
        },
      });
    });

    it('serializes NFT transfer correctly', () => {
      const transfer = Transfer.nft(chainAlias, senderAddress, receiverAddress, {
        address: tokenAddress,
        name: 'CryptoPunks',
        symbol: 'PUNK',
        tokenId: '7804',
      });

      const json = transfer.toJSON();

      expect(json).toMatchObject({
        type: 'nft',
        tokenId: '7804',
        displayAmount: '1 PUNK',
      });
    });

    it('handles null addresses', () => {
      const transfer = Transfer.create({
        type: 'token',
        chainAlias,
        from: null,
        to: null,
        amount: '1000000',
        decimals: 6,
        tokenAddress,
        tokenName: 'Test',
        tokenSymbol: 'TST',
      });

      const json = transfer.toJSON();

      expect(json).toMatchObject({
        from: null,
        to: null,
      });
    });
  });
});
