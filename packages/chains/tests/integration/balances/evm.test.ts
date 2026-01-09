// packages/chains/tests/integration/balances/evm.test.ts

import { describe, it, expect } from 'vitest';
import { EvmBalanceFetcher } from '../../../src/evm/balance.js';
import { getEvmChainConfig } from '../../../src/evm/config.js';

/**
 * EVM Balance Integration Tests
 *
 * These tests make live RPC calls to EVM nodes.
 * Run with: npm run test:integration
 *
 * Note: The default iofinnet RPC URLs are internal. These tests use
 * public RPC endpoints to ensure accessibility.
 */
describe('EVM Balance Integration Tests', () => {
  // Well-known addresses for testing
  const VITALIK_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

  // USDC contract addresses on various chains
  const USDC_CONTRACTS = {
    ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  };

  // Use public RPC endpoints for testing
  const PUBLIC_RPC_URLS = {
    ethereum: 'https://nodes.iofinnet.com/internal/eth',
    polygon: 'https://nodes.iofinnet.com/internal/polygon',
    arbitrum: 'https://nodes.iofinnet.com/internal/arbitrum',
    base: 'https://nodes.iofinnet.com/internal/base',
    avalanche: 'https://alpha-solitary-ensemble.avalanche-mainnet.quiknode.pro/3892ff231edf369e4d72d89c1e8bf964898746ec/ext/bc/C/rpc/',
    bsc: 'https://nodes.iofinnet.com/internal/bsc',
    optimism: 'https://nodes.iofinnet.com/internal/optimism',
    fantom: 'https://nodes.iofinnet.com/internal/fantom',
  };

  describe('Ethereum Mainnet', () => {
    const config = getEvmChainConfig('ethereum', { rpcUrl: PUBLIC_RPC_URLS.ethereum });
    const fetcher = new EvmBalanceFetcher(config);

    it('should fetch native ETH balance for Vitalik address', async () => {
      const balance = await fetcher.getNativeBalance(VITALIK_ADDRESS);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('ETH');
      expect(balance.decimals).toBe(18);
      expect(typeof balance.balance).toBe('string');
      expect(typeof balance.formattedBalance).toBe('string');

      // Vitalik should have some ETH
      const balanceValue = BigInt(balance.balance);
      expect(balanceValue).toBeGreaterThan(0n);
    });

    // Note: This test is skipped because public RPCs often time out
    // or return "no response" for token balance calls due to rate limiting.
    // Works reliably with dedicated RPC endpoints.
    it('should fetch USDC token balance for Vitalik address', async () => {
      const balance = await fetcher.getTokenBalance(VITALIK_ADDRESS, USDC_CONTRACTS.ethereum);

      expect(balance).toBeDefined();
      expect(balance.symbol).toBe('USDC');
      expect(balance.decimals).toBe(6);
      expect(balance.contractAddress).toBe(USDC_CONTRACTS.ethereum);
      expect(typeof balance.balance).toBe('string');
      expect(typeof balance.formattedBalance).toBe('string');
    });
  });

  describe('Polygon Mainnet', () => {
    const config = getEvmChainConfig('polygon', { rpcUrl: PUBLIC_RPC_URLS.polygon });
    const fetcher = new EvmBalanceFetcher(config);

    it('should fetch native POL balance', async () => {
      const balance = await fetcher.getNativeBalance(VITALIK_ADDRESS);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('POL');
      expect(balance.decimals).toBe(18);
      expect(typeof balance.balance).toBe('string');
    });
  });

  describe('Arbitrum Mainnet', () => {
    const config = getEvmChainConfig('arbitrum', { rpcUrl: PUBLIC_RPC_URLS.arbitrum });
    const fetcher = new EvmBalanceFetcher(config);

    it('should fetch native ETH balance on Arbitrum', async () => {
      const balance = await fetcher.getNativeBalance(VITALIK_ADDRESS);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('ETH');
      expect(balance.decimals).toBe(18);
      expect(typeof balance.balance).toBe('string');
    });
  });

  describe('Base Mainnet', () => {
    const config = getEvmChainConfig('base', { rpcUrl: PUBLIC_RPC_URLS.base });
    const fetcher = new EvmBalanceFetcher(config);

    it('should fetch native ETH balance on Base', async () => {
      const balance = await fetcher.getNativeBalance(VITALIK_ADDRESS);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('ETH');
      expect(balance.decimals).toBe(18);
      expect(typeof balance.balance).toBe('string');
    });
  });

  describe('Avalanche C-Chain', () => {
    const config = getEvmChainConfig('avalanche', { rpcUrl: PUBLIC_RPC_URLS.avalanche });
    const fetcher = new EvmBalanceFetcher(config);

    it('should fetch native AVAX balance', async () => {
      const balance = await fetcher.getNativeBalance(VITALIK_ADDRESS);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('AVAX');
      expect(balance.decimals).toBe(18);
      expect(typeof balance.balance).toBe('string');
    });
  });

  describe('BSC Mainnet', () => {
    const config = getEvmChainConfig('bsc', { rpcUrl: PUBLIC_RPC_URLS.bsc });
    const fetcher = new EvmBalanceFetcher(config);

    it('should fetch native BNB balance', async () => {
      const balance = await fetcher.getNativeBalance(VITALIK_ADDRESS);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('BNB');
      expect(balance.decimals).toBe(18);
      expect(typeof balance.balance).toBe('string');
    });
  });

  describe('Optimism Mainnet', () => {
    const config = getEvmChainConfig('optimism', { rpcUrl: PUBLIC_RPC_URLS.optimism });
    const fetcher = new EvmBalanceFetcher(config);

    it('should fetch native ETH balance on Optimism', async () => {
      const balance = await fetcher.getNativeBalance(VITALIK_ADDRESS);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('ETH');
      expect(balance.decimals).toBe(18);
      expect(typeof balance.balance).toBe('string');
    });
  });

  describe('Fantom Mainnet', () => {
    const config = getEvmChainConfig('fantom', { rpcUrl: PUBLIC_RPC_URLS.fantom });
    const fetcher = new EvmBalanceFetcher(config);

    it('should fetch native FTM balance on Fantom', async () => {
      const balance = await fetcher.getNativeBalance(VITALIK_ADDRESS);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('FTM');
      expect(balance.decimals).toBe(18);
      expect(typeof balance.balance).toBe('string');
    });
  });
});
