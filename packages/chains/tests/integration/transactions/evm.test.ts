// packages/chains/tests/integration/transactions/evm.test.ts

import { describe, it, expect } from 'vitest';
import { EvmChainProvider } from '../../../src/evm/provider.js';
import type { UnsignedEvmTransaction } from '../../../src/evm/transaction-builder.js';

/**
 * EVM Transaction Integration Tests
 *
 * These tests make live RPC calls to build and decode transactions.
 * Run with: npm run test:integration
 */
describe('EVM Transaction Integration Tests', () => {
  // Well-known addresses
  const VITALIK_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
  const RECIPIENT_ADDRESS = '0x742d35cC6634c0532925a3B844bc9E7595f3FeFB';
  const USDC_ETH = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

  // Public RPC URLs
  const PUBLIC_RPC_URLS = {
    ethereum: 'https://nodes.iofinnet.com/internal/eth',
    polygon: 'https://nodes.iofinnet.com/internal/polygon',
    arbitrum: 'https://nodes.iofinnet.com/internal/arbitrum',
    base: 'https://nodes.iofinnet.com/internal/base',
  };

  describe('Ethereum Mainnet - Build Transactions', () => {
    const provider = new EvmChainProvider('ethereum', PUBLIC_RPC_URLS.ethereum);

    it('should build unsigned native ETH transfer', async () => {
      const tx = await provider.buildNativeTransfer({
        from: VITALIK_ADDRESS,
        to: RECIPIENT_ADDRESS,
        value: '1000000000000000', // 0.001 ETH
      });

      expect(tx).toBeDefined();
      expect(tx.chainAlias).toBe('ethereum');
      expect(tx.serialized).toBeDefined();

      const evmTx = tx as UnsignedEvmTransaction;
      expect(evmTx.raw).toBeDefined();
      expect(evmTx.raw.to).toBe(RECIPIENT_ADDRESS);
      expect(evmTx.raw.value).toBe('1000000000000000');
      expect(evmTx.raw.chainId).toBe(1);

      // Should be EIP-1559 transaction
      expect(evmTx.raw.type).toBe(2);
      expect(evmTx.raw.maxFeePerGas).toBeDefined();
      expect(evmTx.raw.maxPriorityFeePerGas).toBeDefined();
    });

    it('should build unsigned ERC20 token transfer', async () => {
      const tx = await provider.buildTokenTransfer({
        from: VITALIK_ADDRESS,
        to: RECIPIENT_ADDRESS,
        contractAddress: USDC_ETH,
        value: '1000000', // 1 USDC
      });

      expect(tx).toBeDefined();
      expect(tx.chainAlias).toBe('ethereum');

      const evmTx = tx as UnsignedEvmTransaction;
      expect(evmTx.raw.to).toBe(USDC_ETH);
      expect(evmTx.raw.value).toBe('0');
      // Data should contain ERC20 transfer function selector (0xa9059cbb)
      expect(evmTx.raw.data.startsWith('0xa9059cbb')).toBe(true);
    });

    it('should include nonce from network', async () => {
      const tx = await provider.buildNativeTransfer({
        from: VITALIK_ADDRESS,
        to: RECIPIENT_ADDRESS,
        value: '1000000000000000',
      });

      const evmTx = tx as UnsignedEvmTransaction;
      expect(typeof evmTx.raw.nonce).toBe('number');
      expect(evmTx.raw.nonce).toBeGreaterThanOrEqual(0);
    });

    it('should estimate gas for transfer', async () => {
      const tx = await provider.buildNativeTransfer({
        from: VITALIK_ADDRESS,
        to: RECIPIENT_ADDRESS,
        value: '1000000000000000',
      });

      const evmTx = tx as UnsignedEvmTransaction;
      const gasLimit = BigInt(evmTx.raw.gasLimit);
      // Standard ETH transfer is 21000 gas
      expect(gasLimit).toBeGreaterThanOrEqual(21000n);
    });
  });

  describe('Ethereum Mainnet - Decode Transactions', () => {
    const provider = new EvmChainProvider('ethereum', PUBLIC_RPC_URLS.ethereum);

    it('should decode transaction to normalised format', async () => {
      const tx = await provider.buildNativeTransfer({
        from: VITALIK_ADDRESS,
        to: RECIPIENT_ADDRESS,
        value: '1000000000000000',
      });

      const normalised = provider.decode(tx.serialized, 'normalised');

      expect(normalised).toBeDefined();
      expect(normalised.chainAlias).toBe('ethereum');
      expect(normalised.type).toBe('native-transfer');
      expect(normalised.symbol).toBe('ETH');
      expect(normalised.to).toBe(RECIPIENT_ADDRESS);
      expect(normalised.value).toBe('1000000000000000');
      expect(normalised.formattedValue).toBe('0.001');
    });

    it('should decode transaction to raw format', async () => {
      const tx = await provider.buildNativeTransfer({
        from: VITALIK_ADDRESS,
        to: RECIPIENT_ADDRESS,
        value: '1000000000000000',
      });

      const raw = provider.decode(tx.serialized, 'raw');

      expect(raw).toBeDefined();
      expect(raw._chain).toBe('evm');
      expect(raw.chainId).toBe(1);
      expect(raw.to).toBe(RECIPIENT_ADDRESS);
      expect(raw.value).toBe('1000000000000000');
      expect(raw.type).toBe(2);
    });

    it('should decode token transfer with correct metadata', async () => {
      const tx = await provider.buildTokenTransfer({
        from: VITALIK_ADDRESS,
        to: RECIPIENT_ADDRESS,
        contractAddress: USDC_ETH,
        value: '1000000',
      });

      const normalised = provider.decode(tx.serialized, 'normalised');

      expect(normalised.type).toBe('token-transfer');
      expect(normalised.to).toBe(USDC_ETH);
      expect(normalised.metadata?.isContractDeployment).toBe(false);
    });
  });

  describe('Ethereum Mainnet - Signing Payload', () => {
    const provider = new EvmChainProvider('ethereum', PUBLIC_RPC_URLS.ethereum);

    it('should generate valid signing payload', async () => {
      const tx = await provider.buildNativeTransfer({
        from: VITALIK_ADDRESS,
        to: RECIPIENT_ADDRESS,
        value: '1000000000000000',
      });

      const evmTx = tx as UnsignedEvmTransaction;
      const payload = evmTx.getSigningPayload();

      expect(payload).toBeDefined();
      expect(payload.chainAlias).toBe('ethereum');
      expect(payload.algorithm).toBe('secp256k1');
      expect(payload.data).toBeDefined();
      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.data.length).toBe(1);
      // Should be a valid hex hash (with 0x prefix)
      expect(payload.data[0]).toMatch(/^0x[a-f0-9]{64}$/);
    });
  });

  describe('Ethereum Mainnet - Fee Estimation', () => {
    const provider = new EvmChainProvider('ethereum', PUBLIC_RPC_URLS.ethereum);

    it('should fetch fee estimates', async () => {
      const estimate = await provider.estimateFee();

      expect(estimate).toBeDefined();
      expect(estimate.slow).toBeDefined();
      expect(estimate.standard).toBeDefined();
      expect(estimate.fast).toBeDefined();

      expect(typeof estimate.slow.fee).toBe('string');
      expect(estimate.slow.formattedFee).toContain('ETH');

      const slowFee = BigInt(estimate.slow.fee);
      const standardFee = BigInt(estimate.standard.fee);
      const fastFee = BigInt(estimate.fast.fee);

      expect(fastFee).toBeGreaterThanOrEqual(standardFee);
      expect(standardFee).toBeGreaterThanOrEqual(slowFee);
    });
  });

  describe('Polygon Mainnet - Build Transactions', () => {
    const provider = new EvmChainProvider('polygon', PUBLIC_RPC_URLS.polygon);

    it('should build unsigned native POL transfer', async () => {
      const tx = await provider.buildNativeTransfer({
        from: VITALIK_ADDRESS,
        to: RECIPIENT_ADDRESS,
        value: '1000000000000000000', // 1 POL
      });

      expect(tx).toBeDefined();
      expect(tx.chainAlias).toBe('polygon');

      const evmTx = tx as UnsignedEvmTransaction;
      expect(evmTx.raw.chainId).toBe(137);
    });
  });

  describe('Arbitrum Mainnet - Build Transactions', () => {
    const provider = new EvmChainProvider('arbitrum', PUBLIC_RPC_URLS.arbitrum);

    it('should build unsigned native ETH transfer on Arbitrum', async () => {
      const tx = await provider.buildNativeTransfer({
        from: VITALIK_ADDRESS,
        to: RECIPIENT_ADDRESS,
        value: '1000000000000000',
      });

      expect(tx).toBeDefined();
      expect(tx.chainAlias).toBe('arbitrum');

      const evmTx = tx as UnsignedEvmTransaction;
      expect(evmTx.raw.chainId).toBe(42161);
    });
  });

  describe('Base Mainnet - Build Transactions', () => {
    const provider = new EvmChainProvider('base', PUBLIC_RPC_URLS.base);

    it('should build unsigned native ETH transfer on Base', async () => {
      const tx = await provider.buildNativeTransfer({
        from: VITALIK_ADDRESS,
        to: RECIPIENT_ADDRESS,
        value: '1000000000000000',
      });

      expect(tx).toBeDefined();
      expect(tx.chainAlias).toBe('base');

      const evmTx = tx as UnsignedEvmTransaction;
      expect(evmTx.raw.chainId).toBe(8453);
    });
  });

  describe('EVM - Error Cases', () => {
    const provider = new EvmChainProvider('ethereum', PUBLIC_RPC_URLS.ethereum);

    it('should throw error for invalid from address', async () => {
      await expect(
        provider.buildNativeTransfer({
          from: 'invalid-address',
          to: RECIPIENT_ADDRESS,
          value: '1000000000000000',
        })
      ).rejects.toThrow();
    });

    it('should throw error for invalid to address', async () => {
      await expect(
        provider.buildNativeTransfer({
          from: VITALIK_ADDRESS,
          to: 'invalid-address',
          value: '1000000000000000',
        })
      ).rejects.toThrow();
    });
  });
});
