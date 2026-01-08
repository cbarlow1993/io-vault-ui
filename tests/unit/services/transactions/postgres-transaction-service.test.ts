import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError } from '@iofinnet/errors-sdk';
import { PostgresTransactionService } from '@/src/services/transactions/postgres-service.js';
import type {
  TransactionRepository,
  AddressRepository,
  Transaction,
  NativeTransfer,
  TokenTransferWithMetadata,
} from '@/src/repositories/types.js';

// Mock Chain SDK for TransferEnricher
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

// Mock repositories
function createMockTransactionRepository(): TransactionRepository {
  return {
    findById: vi.fn(),
    findByTxHash: vi.fn(),
    findByAddress: vi.fn(),
    findByChainAliasAndAddress: vi.fn(),
    findNativeTransfersByTxIds: vi.fn(),
    findTokenTransfersByTxIds: vi.fn(),
    findTokenTransfersWithMetadataByTxIds: vi.fn(),
  } as unknown as TransactionRepository;
}

function createMockAddressRepository(): AddressRepository {
  return {
    findById: vi.fn(),
    findByAddressAndChainAlias: vi.fn(),
    findByVaultId: vi.fn(),
    findByVaultIdAndChainAlias: vi.fn(),
    findBySubscriptionId: vi.fn(),
    findMonitoredByVaultId: vi.fn(),
    findByOrganisationId: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    setMonitored: vi.fn(),
    setUnmonitored: vi.fn(),
    updateAlias: vi.fn(),
    addToken: vi.fn(),
    removeToken: vi.fn(),
    findTokensByAddressId: vi.fn(),
    setTokenHidden: vi.fn(),
    setTokensHidden: vi.fn(),
    upsertTokens: vi.fn(),
    deleteByVaultId: vi.fn(),
    findAllMonitored: vi.fn(),
    updateLastReconciledBlock: vi.fn(),
  } as unknown as AddressRepository;
}

function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    chainAlias: 'eth',
    txHash: '0xabc123',
    blockNumber: '12345',
    blockHash: '0xblock123',
    txIndex: 0,
    fromAddress: '0xfrom',
    toAddress: '0xto',
    value: '1000000000000000000',
    fee: '21000000000000',
    status: 'success',
    timestamp: new Date('2024-01-15T10:30:00.000Z'),
    classificationType: 'transfer',
    classificationLabel: 'Transfer',
    createdAt: new Date('2024-01-15T10:30:00.000Z'),
    updatedAt: new Date('2024-01-15T10:30:00.000Z'),
    ...overrides,
  };
}

function createMockNativeTransfer(overrides: Partial<NativeTransfer> = {}): NativeTransfer {
  return {
    id: 'native-1',
    txId: 'tx-1',
    chainAlias: 'eth',
    fromAddress: '0xfrom',
    toAddress: '0xto',
    amount: '1000000000000000000',
    metadata: null,
    createdAt: new Date('2024-01-15T10:30:00.000Z'),
    ...overrides,
  };
}

function createMockTokenTransferWithMetadata(
  overrides: Partial<TokenTransferWithMetadata> = {}
): TokenTransferWithMetadata {
  return {
    id: 'token-transfer-1',
    txId: 'tx-1',
    chainAlias: 'eth',
    tokenAddress: '0xusdc',
    fromAddress: '0xfrom',
    toAddress: '0xto',
    amount: '1000000',
    transferType: 'erc20',
    metadata: null,
    createdAt: new Date('2024-01-15T10:30:00.000Z'),
    tokenName: 'USD Coin',
    tokenSymbol: 'USDC',
    tokenDecimals: 6,
    tokenLogoUri: null,
    tokenCoingeckoId: 'usd-coin',
    tokenIsVerified: true,
    tokenIsSpam: false,
    ...overrides,
  };
}

function createMockAddress(overrides: Record<string, unknown> = {}) {
  return {
    id: 'addr-1',
    address: '0x123abc',
    chain_alias: 'eth',
    ecosystem: 'evm',
    vault_id: 'vault-1',
    workspace_id: 'workspace-1',
    organisation_id: 'org-1',
    derivation_path: null,
    alias: null,
    is_monitored: false,
    subscription_id: null,
    monitored_at: null,
    unmonitored_at: null,
    last_reconciled_block: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

describe('PostgresTransactionService', () => {
  let transactionRepository: ReturnType<typeof createMockTransactionRepository>;
  let addressRepository: ReturnType<typeof createMockAddressRepository>;
  let service: PostgresTransactionService;

  beforeEach(() => {
    vi.clearAllMocks();
    transactionRepository = createMockTransactionRepository();
    addressRepository = createMockAddressRepository();
    service = new PostgresTransactionService({
      transactionRepository,
      addressRepository,
    });
  });

  describe('getByChainAndHash', () => {
    it('throws NotFoundError when transaction does not exist', async () => {
      vi.mocked(transactionRepository.findByTxHash).mockResolvedValue(null);

      await expect(
        service.getByChainAndHash({
          chainAlias: 'eth',
          txHash: '0xnonexistent',
          address: '0x123abc',
        })
      ).rejects.toThrow(NotFoundError);

      await expect(
        service.getByChainAndHash({
          chainAlias: 'eth',
          txHash: '0xnonexistent',
          address: '0x123abc',
        })
      ).rejects.toThrow('Transaction not found: 0xnonexistent on chain eth');

      expect(transactionRepository.findByTxHash).toHaveBeenCalledWith('eth', '0xnonexistent');
    });

    it('returns transaction with transfers and operationId null', async () => {
      const tx = createMockTransaction({ id: 'tx-1', txHash: '0xabc123' });
      const nativeTransfer = createMockNativeTransfer({ txId: 'tx-1', toAddress: '0x123abc' });
      const tokenTransferWithMeta = createMockTokenTransferWithMetadata({ txId: 'tx-1', toAddress: '0x123abc' });

      vi.mocked(transactionRepository.findByTxHash).mockResolvedValue(tx);
      vi.mocked(transactionRepository.findNativeTransfersByTxIds).mockResolvedValue([nativeTransfer]);
      vi.mocked(transactionRepository.findTokenTransfersWithMetadataByTxIds).mockResolvedValue([tokenTransferWithMeta]);

      const result = await service.getByChainAndHash({
        chainAlias: 'eth',
        txHash: '0xabc123',
        address: '0x123abc',
      });

      expect(result.id).toBe('tx-1');
      expect(result.txHash).toBe('0xabc123');
      expect(result.transfers).toHaveLength(2);
      expect(result.operationId).toBeNull();

      expect(transactionRepository.findByTxHash).toHaveBeenCalledWith('eth', '0xabc123');
      expect(transactionRepository.findNativeTransfersByTxIds).toHaveBeenCalledWith(['tx-1']);
      expect(transactionRepository.findTokenTransfersWithMetadataByTxIds).toHaveBeenCalledWith(['tx-1']);
    });

    it('returns empty transfers array when no transfers exist', async () => {
      const tx = createMockTransaction({ id: 'tx-1', txHash: '0xabc123' });

      vi.mocked(transactionRepository.findByTxHash).mockResolvedValue(tx);
      vi.mocked(transactionRepository.findNativeTransfersByTxIds).mockResolvedValue([]);
      vi.mocked(transactionRepository.findTokenTransfersWithMetadataByTxIds).mockResolvedValue([]);

      const result = await service.getByChainAndHash({
        chainAlias: 'eth',
        txHash: '0xabc123',
        address: '0x123abc',
      });

      expect(result.transfers).toEqual([]);
      expect(result.operationId).toBeNull();
    });

    it('resolves testnet chain alias correctly', async () => {
      const tx = createMockTransaction({ id: 'tx-1', chainAlias: 'eth-sepolia' });

      vi.mocked(transactionRepository.findByTxHash).mockResolvedValue(tx);
      vi.mocked(transactionRepository.findNativeTransfersByTxIds).mockResolvedValue([]);
      vi.mocked(transactionRepository.findTokenTransfersWithMetadataByTxIds).mockResolvedValue([]);

      const result = await service.getByChainAndHash({
        chainAlias: 'eth-sepolia',
        txHash: '0xabc123',
        address: '0x123abc',
      });

      expect(transactionRepository.findByTxHash).toHaveBeenCalledWith('eth-sepolia', '0xabc123');
      expect(result.chainAlias).toBe('eth-sepolia');
    });

    it('returns transaction with multiple transfers', async () => {
      const tx = createMockTransaction({ id: 'tx-1' });
      const nativeTransfer1 = createMockNativeTransfer({ id: 'native-1', txId: 'tx-1' });
      const nativeTransfer2 = createMockNativeTransfer({ id: 'native-2', txId: 'tx-1' });
      const tokenTransfer1 = createMockTokenTransferWithMetadata({ id: 'token-1', txId: 'tx-1' });
      const tokenTransfer2 = createMockTokenTransferWithMetadata({ id: 'token-2', txId: 'tx-1' });

      vi.mocked(transactionRepository.findByTxHash).mockResolvedValue(tx);
      vi.mocked(transactionRepository.findNativeTransfersByTxIds).mockResolvedValue([
        nativeTransfer1,
        nativeTransfer2,
      ]);
      vi.mocked(transactionRepository.findTokenTransfersWithMetadataByTxIds).mockResolvedValue([
        tokenTransfer1,
        tokenTransfer2,
      ]);

      const result = await service.getByChainAndHash({
        chainAlias: 'eth',
        txHash: '0xabc123',
        address: '0x123abc',
      });

      expect(result.transfers).toHaveLength(4);
      // Verify native transfers come first, then token transfers
      expect(result.transfers![0]!.transferType).toBe('native');
      expect(result.transfers![1]!.transferType).toBe('native');
      expect(result.transfers![2]!.transferType).toBe('token');
      expect(result.transfers![3]!.transferType).toBe('token');
    });

    it('fetches native and token transfers in parallel', async () => {
      const tx = createMockTransaction({ id: 'tx-1' });

      vi.mocked(transactionRepository.findByTxHash).mockResolvedValue(tx);

      // Track call order
      const callOrder: string[] = [];
      vi.mocked(transactionRepository.findNativeTransfersByTxIds).mockImplementation(async () => {
        callOrder.push('native-start');
        await new Promise((resolve) => setTimeout(resolve, 10));
        callOrder.push('native-end');
        return [];
      });
      vi.mocked(transactionRepository.findTokenTransfersWithMetadataByTxIds).mockImplementation(async () => {
        callOrder.push('token-start');
        await new Promise((resolve) => setTimeout(resolve, 10));
        callOrder.push('token-end');
        return [];
      });

      await service.getByChainAndHash({
        chainAlias: 'eth',
        txHash: '0xabc123',
        address: '0x123abc',
      });

      // Both should start before either ends (parallel execution)
      expect(callOrder.indexOf('native-start')).toBeLessThan(callOrder.indexOf('native-end'));
      expect(callOrder.indexOf('token-start')).toBeLessThan(callOrder.indexOf('token-end'));
      // Both starts should happen before both ends
      expect(callOrder.slice(0, 2).sort()).toEqual(['native-start', 'token-start']);
    });

    it('returns enriched transfers with direction based on perspective address', async () => {
      const tx = createMockTransaction({ id: 'tx-1', txHash: '0xabc123' });
      const nativeTransfer = createMockNativeTransfer({
        txId: 'tx-1',
        fromAddress: '0xsender',
        toAddress: '0x123abc',
        amount: '1000000000000000000',
      });

      vi.mocked(transactionRepository.findByTxHash).mockResolvedValue(tx);
      vi.mocked(transactionRepository.findNativeTransfersByTxIds).mockResolvedValue([nativeTransfer]);
      vi.mocked(transactionRepository.findTokenTransfersWithMetadataByTxIds).mockResolvedValue([]);

      const result = await service.getByChainAndHash({
        chainAlias: 'eth',
        txHash: '0xabc123',
        address: '0x123abc',
      });

      expect(result.transfers).toHaveLength(1);
      expect(result.transfers![0]!.direction).toBe('in');
      expect(result.transfers![0]!.transferType).toBe('native');
      expect(result.transfers![0]!.formattedAmount).toBe('1');
      expect(result.transfers![0]!.displayAmount).toBe('1 ETH');
      expect(result.transfers![0]!.asset.symbol).toBe('ETH');
    });
  });

  describe('listByChainAliasAndAddress', () => {
    it('throws NotFoundError when address does not exist', async () => {
      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(null);

      await expect(
        service.listByChainAliasAndAddress({
          chainAlias: 'eth',
          address: '0xnonexistent',
        })
      ).rejects.toThrow(NotFoundError);

      await expect(
        service.listByChainAliasAndAddress({
          chainAlias: 'eth',
          address: '0xnonexistent',
        })
      ).rejects.toThrow('Address not found: 0xnonexistent on chain eth');

      expect(addressRepository.findByAddressAndChainAlias).toHaveBeenCalledWith('0xnonexistent', 'eth');
    });

    it('returns empty transactions for known address with no transactions', async () => {
      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(createMockAddress());
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });

      const result = await service.listByChainAliasAndAddress({
        chainAlias: 'eth',
        address: '0x123abc',
      });

      expect(result.transactions).toEqual([]);
      expect(result.pagination).toEqual({
        nextCursor: null,
        hasMore: false,
      });

      expect(transactionRepository.findByChainAliasAndAddress).toHaveBeenCalledWith('eth', '0x123abc', {
        cursor: undefined,
        limit: 20,
        sort: 'desc',
        direction: undefined,
      });
    });

    it('returns transactions with pagination cursors', async () => {
      const tx1 = createMockTransaction({ id: 'tx-1', timestamp: new Date('2024-01-15T10:00:00.000Z') });
      const tx2 = createMockTransaction({ id: 'tx-2', timestamp: new Date('2024-01-15T11:00:00.000Z') });

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(createMockAddress());
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [tx2, tx1],
        hasMore: true,
      });

      const result = await service.listByChainAliasAndAddress({
        chainAlias: 'eth',
        address: '0x123abc',
        limit: 2,
      });

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]!.id).toBe('tx-2');
      expect(result.transactions[1]!.id).toBe('tx-1');

      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.nextCursor).not.toBeNull();

      // Verify the cursor is properly encoded
      const nextCursor = result.pagination.nextCursor!;
      expect(typeof nextCursor).toBe('string');
      expect(nextCursor.length).toBeGreaterThan(0);
    });

    it('uses cursor for pagination', async () => {
      const tx = createMockTransaction({ id: 'tx-3', timestamp: new Date('2024-01-15T09:00:00.000Z') });

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(createMockAddress());
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [tx],
        hasMore: false,
      });

      // Create a valid cursor
      const { encodeCursor } = await import('@/src/services/transactions/cursor.js');
      const cursor = encodeCursor(new Date('2024-01-15T10:00:00.000Z'), 'tx-1');

      const result = await service.listByChainAliasAndAddress({
        chainAlias: 'eth',
        address: '0x123abc',
        cursor,
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.nextCursor).toBeNull();

      // Verify cursor was passed to repository
      expect(transactionRepository.findByChainAliasAndAddress).toHaveBeenCalledWith(
        'eth',
        '0x123abc',
        expect.objectContaining({
          cursor: expect.objectContaining({
            timestamp: expect.any(Date),
            txId: 'tx-1',
          }),
        })
      );
    });

    it('includes transfers when requested', async () => {
      const tx1 = createMockTransaction({ id: 'tx-1' });
      const tx2 = createMockTransaction({ id: 'tx-2' });
      const nativeTransfer1 = createMockNativeTransfer({ id: 'native-1', txId: 'tx-1' });
      const nativeTransfer2 = createMockNativeTransfer({ id: 'native-2', txId: 'tx-2' });
      const tokenTransfer1 = createMockTokenTransferWithMetadata({ id: 'token-1', txId: 'tx-1' });
      const tokenTransfer2a = createMockTokenTransferWithMetadata({ id: 'token-2a', txId: 'tx-2' });
      const tokenTransfer2b = createMockTokenTransferWithMetadata({ id: 'token-2b', txId: 'tx-2' });

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(createMockAddress());
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [tx1, tx2],
        hasMore: false,
      });
      vi.mocked(transactionRepository.findNativeTransfersByTxIds).mockResolvedValue([
        nativeTransfer1,
        nativeTransfer2,
      ]);
      vi.mocked(transactionRepository.findTokenTransfersWithMetadataByTxIds).mockResolvedValue([
        tokenTransfer1,
        tokenTransfer2a,
        tokenTransfer2b,
      ]);

      const result = await service.listByChainAliasAndAddress({
        chainAlias: 'eth',
        address: '0x123abc',
        includeTransfers: true,
      });

      expect(result.transactions).toHaveLength(2);

      // First transaction - 1 native + 1 token transfer
      expect(result.transactions[0]!.transfers).toHaveLength(2);

      // Second transaction - 1 native + 2 token transfers
      expect(result.transactions[1]!.transfers).toHaveLength(3);

      expect(transactionRepository.findNativeTransfersByTxIds).toHaveBeenCalledWith(['tx-1', 'tx-2']);
      expect(transactionRepository.findTokenTransfersWithMetadataByTxIds).toHaveBeenCalledWith(['tx-1', 'tx-2']);
    });

    it('does not fetch transfers when includeTransfers is not set', async () => {
      const tx = createMockTransaction({ id: 'tx-1' });

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(createMockAddress());
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [tx],
        hasMore: false,
      });

      const result = await service.listByChainAliasAndAddress({
        chainAlias: 'eth',
        address: '0x123abc',
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]!.transfers).toBeUndefined();

      expect(transactionRepository.findNativeTransfersByTxIds).not.toHaveBeenCalled();
      expect(transactionRepository.findTokenTransfersWithMetadataByTxIds).not.toHaveBeenCalled();
    });

    it('respects sort parameter', async () => {
      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(createMockAddress());
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });

      await service.listByChainAliasAndAddress({
        chainAlias: 'eth',
        address: '0x123abc',
        sort: 'asc',
      });

      expect(transactionRepository.findByChainAliasAndAddress).toHaveBeenCalledWith(
        'eth',
        '0x123abc',
        expect.objectContaining({ sort: 'asc' })
      );
    });

    it('clamps limit to maximum of 100', async () => {
      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(createMockAddress());
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });

      await service.listByChainAliasAndAddress({
        chainAlias: 'eth',
        address: '0x123abc',
        limit: 500,
      });

      expect(transactionRepository.findByChainAliasAndAddress).toHaveBeenCalledWith(
        'eth',
        '0x123abc',
        expect.objectContaining({ limit: 100 })
      );
    });

    it('uses default limit of 20 when not specified', async () => {
      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(createMockAddress());
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });

      await service.listByChainAliasAndAddress({
        chainAlias: 'eth',
        address: '0x123abc',
      });

      expect(transactionRepository.findByChainAliasAndAddress).toHaveBeenCalledWith(
        'eth',
        '0x123abc',
        expect.objectContaining({ limit: 20 })
      );
    });

    it('resolves testnet chain alias correctly', async () => {
      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(
        createMockAddress({ chain_alias: 'eth-sepolia' })
      );
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });

      await service.listByChainAliasAndAddress({
        chainAlias: 'eth-sepolia',
        address: '0x123abc',
      });

      expect(addressRepository.findByAddressAndChainAlias).toHaveBeenCalledWith('0x123abc', 'eth-sepolia');
      expect(transactionRepository.findByChainAliasAndAddress).toHaveBeenCalledWith(
        'eth-sepolia',
        '0x123abc',
        expect.any(Object)
      );
    });

    it('returns empty transfers array when no transfers exist for transaction', async () => {
      const tx = createMockTransaction({ id: 'tx-1' });

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(createMockAddress());
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [tx],
        hasMore: false,
      });
      vi.mocked(transactionRepository.findNativeTransfersByTxIds).mockResolvedValue([]);
      vi.mocked(transactionRepository.findTokenTransfersWithMetadataByTxIds).mockResolvedValue([]);

      const result = await service.listByChainAliasAndAddress({
        chainAlias: 'eth',
        address: '0x123abc',
        includeTransfers: true,
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]!.transfers).toEqual([]);
    });
  });
});
