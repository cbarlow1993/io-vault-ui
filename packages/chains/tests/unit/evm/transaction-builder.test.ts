// packages/chains/tests/unit/evm/transaction-builder.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnsignedEvmTransaction } from '../../../src/evm/transaction-builder.js';
import type { EvmChainConfig } from '../../../src/evm/config.js';

describe('UnsignedEvmTransaction', () => {
  const mockConfig: EvmChainConfig = {
    chainAlias: 'ethereum',
    chainId: 1,
    rpcUrl: 'https://test-rpc.com',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  };

  const mockTxData = {
    type: 2 as const,
    chainId: 1,
    nonce: 0,
    to: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    value: '1000000000000000000',
    data: '0x',
    gasLimit: '21000',
    maxFeePerGas: '50000000000',
    maxPriorityFeePerGas: '2000000000',
  };

  describe('constructor', () => {
    it('creates transaction with correct properties', () => {
      const tx = new UnsignedEvmTransaction(mockConfig, mockTxData);
      expect(tx.chainAlias).toBe('ethereum');
      expect(tx.raw).toEqual(mockTxData);
      expect(tx.serialized).toBeDefined();
    });
  });

  describe('rebuild', () => {
    it('returns new transaction with updated nonce', () => {
      const tx = new UnsignedEvmTransaction(mockConfig, mockTxData);
      const rebuilt = tx.rebuild({ nonce: 5 });
      expect(rebuilt).not.toBe(tx);
      expect((rebuilt.raw as typeof mockTxData).nonce).toBe(5);
      expect((tx.raw as typeof mockTxData).nonce).toBe(0);
    });

    it('returns new transaction with updated gas', () => {
      const tx = new UnsignedEvmTransaction(mockConfig, mockTxData);
      const rebuilt = tx.rebuild({
        maxFeePerGas: '100000000000',
        maxPriorityFeePerGas: '5000000000',
      });
      expect((rebuilt.raw as typeof mockTxData).maxFeePerGas).toBe('100000000000');
      expect((rebuilt.raw as typeof mockTxData).maxPriorityFeePerGas).toBe('5000000000');
    });
  });

  describe('getSigningPayload', () => {
    it('returns secp256k1 algorithm', () => {
      const tx = new UnsignedEvmTransaction(mockConfig, mockTxData);
      const payload = tx.getSigningPayload();
      expect(payload.algorithm).toBe('secp256k1');
      expect(payload.chainAlias).toBe('ethereum');
      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.data.length).toBe(1);
    });
  });

  describe('toNormalised', () => {
    it('returns normalised native transfer', () => {
      const tx = new UnsignedEvmTransaction(mockConfig, mockTxData);
      const normalised = tx.toNormalised();
      expect(normalised.chainAlias).toBe('ethereum');
      expect(normalised.to).toBe(mockTxData.to);
      expect(normalised.value).toBe(mockTxData.value);
      expect(normalised.type).toBe('native-transfer');
      expect(normalised.symbol).toBe('ETH');
    });

    it('identifies contract deployment when to is null', () => {
      const deployTx = new UnsignedEvmTransaction(mockConfig, {
        ...mockTxData,
        to: null,
        data: '0x608060405234801561001057600080fd5b50',
      });
      const normalised = deployTx.toNormalised();
      expect(normalised.type).toBe('contract-deployment');
      expect(normalised.to).toBeNull();
      expect(normalised.metadata.isContractDeployment).toBe(true);
    });
  });
});
