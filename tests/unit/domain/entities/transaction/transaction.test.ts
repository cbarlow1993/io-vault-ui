import { describe, expect, it } from 'vitest';
import {
  Transaction,
  type CreateTransactionData,
  type TransactionRow,
} from '@/src/domain/entities/transaction/transaction.js';
import { Transfer } from '@/src/domain/entities/transaction/transfer.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

describe('Transaction', () => {
  const chainAlias = 'ethereum' as ChainAlias;
  const senderAddress = '0x1234567890123456789012345678901234567890';
  const receiverAddress = '0x0987654321098765432109876543210987654321';
  const txHash = '0xabc123def456789012345678901234567890abcdef1234567890abcdef12345678';

  const createTransactionData = (
    overrides: Partial<CreateTransactionData> = {}
  ): CreateTransactionData => ({
    id: 'tx-123',
    chainAlias,
    hash: txHash,
    blockNumber: '18000000',
    blockHash: '0xblock123',
    timestamp: new Date('2024-01-15T12:00:00Z'),
    from: senderAddress,
    to: receiverAddress,
    value: '1000000000000000000',
    fee: '21000000000000',
    status: 'success',
    ...overrides,
  });

  const createTransfer = () =>
    Transfer.native(chainAlias, senderAddress, receiverAddress, '1000000000000000000', {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    });

  describe('create', () => {
    it('creates a Transaction entity with required fields', () => {
      const tx = Transaction.create(createTransactionData());

      expect(tx.id).toBe('tx-123');
      expect(tx.chainAlias).toBe('ethereum');
      expect(tx.hash.value).toBe(txHash.toLowerCase());
      expect(tx.blockNumber).toBe('18000000');
      expect(tx.from.normalized).toBe(senderAddress.toLowerCase());
      expect(tx.to?.normalized).toBe(receiverAddress.toLowerCase());
      expect(tx.status).toBe('success');
    });

    it('creates a Transaction with null to address', () => {
      const tx = Transaction.create(createTransactionData({ to: null }));

      expect(tx.to).toBeNull();
    });

    it('creates a Transaction with classification', () => {
      const tx = Transaction.create(
        createTransactionData({
          classification: {
            type: 'transfer',
            direction: 'out',
            confidence: 'high',
            source: 'custom',
            label: 'Sent 1 ETH',
          },
        })
      );

      expect(tx.classification.type).toBe('transfer');
      expect(tx.classification.direction).toBe('out');
      expect(tx.label).toBe('Sent 1 ETH');
    });

    it('creates a Transaction with transfers', () => {
      const transfer = createTransfer();
      const tx = Transaction.create(
        createTransactionData({
          transfers: [transfer],
        })
      );

      expect(tx.transfers).toHaveLength(1);
      expect(tx.transfers[0]).toBe(transfer);
    });

    it('creates unknown classification by default', () => {
      const tx = Transaction.create(createTransactionData());

      expect(tx.classification.type).toBe('unknown');
      expect(tx.classification.isUnknown).toBe(true);
    });

    it('parses value and fee with 18 decimals', () => {
      const tx = Transaction.create(createTransactionData());

      expect(tx.value.formatted).toBe('1');
      expect(tx.fee?.formatted).toBe('0.000021');
    });

    it('handles null fee', () => {
      const tx = Transaction.create(createTransactionData({ fee: null }));

      expect(tx.fee).toBeNull();
    });
  });

  describe('fromDatabase', () => {
    const createTransactionRow = (overrides: Partial<TransactionRow> = {}): TransactionRow => ({
      id: 'tx-456',
      chainAlias,
      txHash: txHash,
      blockNumber: '18000001',
      blockHash: '0xblock456',
      timestamp: new Date('2024-01-16T12:00:00Z'),
      fromAddress: senderAddress,
      toAddress: receiverAddress,
      value: '2000000000000000000',
      fee: '42000000000000',
      status: 'success',
      classificationType: null,
      classificationLabel: null,
      ...overrides,
    });

    it('reconstitutes Transaction from database row', () => {
      const tx = Transaction.fromDatabase(createTransactionRow());

      expect(tx.id).toBe('tx-456');
      expect(tx.hash.value).toBe(txHash.toLowerCase());
      expect(tx.from.normalized).toBe(senderAddress.toLowerCase());
      expect(tx.value.formatted).toBe('2');
    });

    it('reconstitutes with classification type and label', () => {
      const tx = Transaction.fromDatabase(
        createTransactionRow({
          classificationType: 'swap',
          classificationLabel: 'Swapped ETH for USDC',
        })
      );

      expect(tx.classification.type).toBe('swap');
      expect(tx.label).toBe('Swapped ETH for USDC');
    });

    it('reconstitutes with transfers', () => {
      const transfer = createTransfer();
      const tx = Transaction.fromDatabase(createTransactionRow(), [transfer]);

      expect(tx.transfers).toHaveLength(1);
    });

    it('defaults to unknown classification when no type stored', () => {
      const tx = Transaction.fromDatabase(createTransactionRow());

      expect(tx.classification.type).toBe('unknown');
    });
  });

  describe('status computed properties', () => {
    it('isSuccess returns true for success status', () => {
      const tx = Transaction.create(createTransactionData({ status: 'success' }));
      expect(tx.isSuccess).toBe(true);
      expect(tx.isFailed).toBe(false);
      expect(tx.isPending).toBe(false);
    });

    it('isFailed returns true for failed status', () => {
      const tx = Transaction.create(createTransactionData({ status: 'failed' }));
      expect(tx.isFailed).toBe(true);
      expect(tx.isSuccess).toBe(false);
      expect(tx.isPending).toBe(false);
    });

    it('isPending returns true for pending status', () => {
      const tx = Transaction.create(createTransactionData({ status: 'pending' }));
      expect(tx.isPending).toBe(true);
      expect(tx.isSuccess).toBe(false);
      expect(tx.isFailed).toBe(false);
    });
  });

  describe('transfer computed properties', () => {
    it('nativeTransfers returns only native transfers', () => {
      const nativeTransfer = Transfer.native(chainAlias, senderAddress, receiverAddress, '1000000000000000000', {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
      });
      const tokenTransfer = Transfer.token(chainAlias, senderAddress, receiverAddress, '1000000', {
        address: '0xtoken',
        name: 'Token',
        symbol: 'TKN',
        decimals: 6,
      });

      const tx = Transaction.create(
        createTransactionData({
          transfers: [nativeTransfer, tokenTransfer],
        })
      );

      expect(tx.nativeTransfers).toHaveLength(1);
      expect(tx.nativeTransfers[0].isNative).toBe(true);
    });

    it('tokenTransfers returns only token transfers', () => {
      const nativeTransfer = Transfer.native(chainAlias, senderAddress, receiverAddress, '1000000000000000000', {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
      });
      const tokenTransfer = Transfer.token(chainAlias, senderAddress, receiverAddress, '1000000', {
        address: '0xtoken',
        name: 'Token',
        symbol: 'TKN',
        decimals: 6,
      });

      const tx = Transaction.create(
        createTransactionData({
          transfers: [nativeTransfer, tokenTransfer],
        })
      );

      expect(tx.tokenTransfers).toHaveLength(1);
      expect(tx.tokenTransfers[0].isToken).toBe(true);
    });

    it('nftTransfers returns only NFT transfers', () => {
      const nftTransfer = Transfer.nft(chainAlias, senderAddress, receiverAddress, {
        address: '0xnft',
        name: 'NFT',
        symbol: 'NFT',
        tokenId: '123',
      });

      const tx = Transaction.create(
        createTransactionData({
          transfers: [nftTransfer],
        })
      );

      expect(tx.nftTransfers).toHaveLength(1);
      expect(tx.nftTransfers[0].isNft).toBe(true);
    });

    it('hasTransfers returns correct value', () => {
      const txWithTransfers = Transaction.create(
        createTransactionData({ transfers: [createTransfer()] })
      );
      const txWithoutTransfers = Transaction.create(createTransactionData());

      expect(txWithTransfers.hasTransfers).toBe(true);
      expect(txWithoutTransfers.hasTransfers).toBe(false);
    });

    it('transferCount returns correct count', () => {
      const tx = Transaction.create(
        createTransactionData({
          transfers: [createTransfer(), createTransfer()],
        })
      );

      expect(tx.transferCount).toBe(2);
    });
  });

  describe('getDirection', () => {
    it('returns out when perspective is sender', () => {
      const transfer = createTransfer();
      const tx = Transaction.create(
        createTransactionData({
          classification: { type: 'transfer', direction: 'neutral', confidence: 'high', source: 'custom', label: 'Test' },
          transfers: [transfer],
        })
      );

      const perspective = WalletAddress.create(senderAddress, chainAlias);
      expect(tx.getDirection(perspective)).toBe('out');
    });

    it('returns in when perspective is receiver', () => {
      const transfer = createTransfer();
      const tx = Transaction.create(
        createTransactionData({
          classification: { type: 'transfer', direction: 'neutral', confidence: 'high', source: 'custom', label: 'Test' },
          transfers: [transfer],
        })
      );

      const perspective = WalletAddress.create(receiverAddress, chainAlias);
      expect(tx.getDirection(perspective)).toBe('in');
    });

    it('uses main tx addresses when no transfers', () => {
      const tx = Transaction.create(
        createTransactionData({
          classification: { type: 'transfer', direction: 'neutral', confidence: 'high', source: 'custom', label: 'Transfer' },
        })
      );

      const senderPerspective = WalletAddress.create(senderAddress, chainAlias);
      const receiverPerspective = WalletAddress.create(receiverAddress, chainAlias);

      expect(tx.getDirection(senderPerspective)).toBe('out');
      expect(tx.getDirection(receiverPerspective)).toBe('in');
    });
  });

  describe('getLabel', () => {
    it('generates label from perspective', () => {
      const transfer = createTransfer();
      const tx = Transaction.create(
        createTransactionData({
          classification: { type: 'transfer', direction: 'neutral', confidence: 'high', source: 'custom', label: 'Test' },
          transfers: [transfer],
        })
      );

      const senderPerspective = WalletAddress.create(senderAddress, chainAlias);
      const receiverPerspective = WalletAddress.create(receiverAddress, chainAlias);

      expect(tx.getLabel(senderPerspective)).toBe('Sent 1 ETH');
      expect(tx.getLabel(receiverPerspective)).toBe('Received 1 ETH');
    });
  });

  describe('getInvolvedAddresses', () => {
    it('returns all unique addresses', () => {
      const otherAddress = '0x1111111111111111111111111111111111111111';
      const transfer1 = Transfer.native(chainAlias, senderAddress, receiverAddress, '1', {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
      });
      const transfer2 = Transfer.native(chainAlias, receiverAddress, otherAddress, '1', {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
      });

      const tx = Transaction.create(
        createTransactionData({
          transfers: [transfer1, transfer2],
        })
      );

      const addresses = tx.getInvolvedAddresses();

      expect(addresses).toHaveLength(3);
      expect(addresses.map((a) => a.normalized)).toContain(senderAddress.toLowerCase());
      expect(addresses.map((a) => a.normalized)).toContain(receiverAddress.toLowerCase());
      expect(addresses.map((a) => a.normalized)).toContain(otherAddress.toLowerCase());
    });

    it('deduplicates addresses', () => {
      const transfer = createTransfer();
      const tx = Transaction.create(
        createTransactionData({
          transfers: [transfer],
        })
      );

      const addresses = tx.getInvolvedAddresses();

      // sender and receiver are in both tx.from/to and transfer.from/to
      expect(addresses).toHaveLength(2);
    });
  });

  describe('getTokenAddresses', () => {
    it('returns unique token addresses', () => {
      const tokenAddress1 = '0xtoken1111111111111111111111111111111111111';
      const tokenAddress2 = '0xtoken2222222222222222222222222222222222222';

      const token1 = Transfer.token(chainAlias, senderAddress, receiverAddress, '1000000', {
        address: tokenAddress1,
        name: 'Token1',
        symbol: 'TK1',
        decimals: 6,
      });
      const token2 = Transfer.token(chainAlias, senderAddress, receiverAddress, '1000000', {
        address: tokenAddress2,
        name: 'Token2',
        symbol: 'TK2',
        decimals: 6,
      });

      const tx = Transaction.create(
        createTransactionData({
          transfers: [token1, token2],
        })
      );

      const tokenAddresses = tx.getTokenAddresses();

      expect(tokenAddresses).toHaveLength(2);
      expect(tokenAddresses).toContain(tokenAddress1.toLowerCase());
      expect(tokenAddresses).toContain(tokenAddress2.toLowerCase());
    });

    it('excludes native transfers', () => {
      const nativeTransfer = createTransfer();
      const tx = Transaction.create(
        createTransactionData({
          transfers: [nativeTransfer],
        })
      );

      const tokenAddresses = tx.getTokenAddresses();
      expect(tokenAddresses).toHaveLength(0);
    });
  });

  describe('involves', () => {
    it('returns true when address is tx from', () => {
      const tx = Transaction.create(createTransactionData());
      const address = WalletAddress.create(senderAddress, chainAlias);

      expect(tx.involves(address)).toBe(true);
    });

    it('returns true when address is tx to', () => {
      const tx = Transaction.create(createTransactionData());
      const address = WalletAddress.create(receiverAddress, chainAlias);

      expect(tx.involves(address)).toBe(true);
    });

    it('returns true when address is in transfer', () => {
      const otherAddress = '0x1111111111111111111111111111111111111111';
      const transfer = Transfer.native(chainAlias, senderAddress, otherAddress, '1', {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
      });

      const tx = Transaction.create(
        createTransactionData({
          to: receiverAddress,
          transfers: [transfer],
        })
      );

      const address = WalletAddress.create(otherAddress, chainAlias);
      expect(tx.involves(address)).toBe(true);
    });

    it('returns false when address is not involved', () => {
      const tx = Transaction.create(createTransactionData());
      const address = WalletAddress.create('0x1111111111111111111111111111111111111111', chainAlias);

      expect(tx.involves(address)).toBe(false);
    });
  });

  describe('withClassification', () => {
    it('creates new transaction with updated classification', () => {
      const original = Transaction.create(createTransactionData());

      const updated = original.withClassification({
        type: 'swap',
        direction: 'neutral',
        confidence: 'high',
        source: 'noves',
        label: 'Swapped tokens',
      });

      expect(updated.classification.type).toBe('swap');
      expect(updated.label).toBe('Swapped tokens');
      expect(original.classification.type).toBe('unknown');
    });
  });

  describe('withTransfers', () => {
    it('creates new transaction with transfers', () => {
      const original = Transaction.create(createTransactionData());
      const transfer = createTransfer();

      const updated = original.withTransfers([transfer]);

      expect(updated.transfers).toHaveLength(1);
      expect(original.transfers).toHaveLength(0);
    });
  });

  describe('equals', () => {
    it('returns true for same id', () => {
      const a = Transaction.create(createTransactionData({ id: 'tx-same' }));
      const b = Transaction.create(createTransactionData({ id: 'tx-same', hash: '0xdifferent' }));

      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different id', () => {
      const a = Transaction.create(createTransactionData({ id: 'tx-a' }));
      const b = Transaction.create(createTransactionData({ id: 'tx-b' }));

      expect(a.equals(b)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('transaction is frozen', () => {
      const tx = Transaction.create(createTransactionData());
      expect(Object.isFrozen(tx)).toBe(true);
    });

    it('transfers array is frozen', () => {
      const tx = Transaction.create(
        createTransactionData({
          transfers: [createTransfer()],
        })
      );
      expect(Object.isFrozen(tx.transfers)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('serializes correctly', () => {
      const transfer = createTransfer();
      const tx = Transaction.create(
        createTransactionData({
          classification: {
            type: 'transfer',
            direction: 'out',
            confidence: 'high',
            source: 'custom',
            label: 'Sent 1 ETH',
          },
          transfers: [transfer],
        })
      );

      const json = tx.toJSON();

      expect(json).toMatchObject({
        id: 'tx-123',
        hash: txHash.toLowerCase(),
        chainAlias: 'ethereum',
        blockNumber: '18000000',
        from: senderAddress.toLowerCase(),
        to: receiverAddress.toLowerCase(),
        value: '1000000000000000000',
        fee: '21000000000000',
        status: 'success',
        classification: {
          type: 'transfer',
          direction: 'out',
        },
      });

      expect((json as { transfers: unknown[] }).transfers).toHaveLength(1);
    });

    it('handles null to address', () => {
      const tx = Transaction.create(createTransactionData({ to: null }));
      const json = tx.toJSON();

      expect((json as { to: string | null }).to).toBeNull();
    });

    it('handles null fee', () => {
      const tx = Transaction.create(createTransactionData({ fee: null }));
      const json = tx.toJSON();

      expect((json as { fee: string | null }).fee).toBeNull();
    });
  });
});
