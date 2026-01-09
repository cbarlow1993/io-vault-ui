// packages/chains/tests/fixtures/config.ts
// Shared test configurations for transaction fetcher tests

import type { EvmChainConfig } from '../../src/evm/config.js';
import type { SvmChainConfig } from '../../src/svm/config.js';
import type { UtxoChainConfig } from '../../src/utxo/config.js';
import type { TvmChainConfig } from '../../src/tvm/config.js';

// Test RPC URLs
export const TEST_RPC_URLS = {
  evm: 'https://test-rpc.example.com',
  solana: 'https://api.mainnet-beta.solana.com',
  bitcoin: 'https://blockbook.example.com',
  tron: 'https://api.trongrid.io',
} as const;

// EVM Test Configuration
export const mockEvmConfig: EvmChainConfig = {
  chainAlias: 'ethereum',
  rpcUrl: TEST_RPC_URLS.evm,
  nativeCurrency: { symbol: 'ETH', decimals: 18 },
  chainId: 1,
  supportsEip1559: true,
};

// SVM Test Configuration
export const mockSvmConfig: SvmChainConfig = {
  chainAlias: 'solana',
  rpcUrl: TEST_RPC_URLS.solana,
  nativeCurrency: { symbol: 'SOL', decimals: 9 },
  isDevnet: false,
};

// UTXO Test Configuration
export const mockUtxoConfig: UtxoChainConfig = {
  chainAlias: 'bitcoin',
  rpcUrl: TEST_RPC_URLS.bitcoin,
  nativeCurrency: { symbol: 'BTC', decimals: 8 },
  network: 'mainnet',
};

// TVM Test Configuration
export const mockTvmConfig: TvmChainConfig = {
  chainAlias: 'tron',
  rpcUrl: TEST_RPC_URLS.tron,
  nativeCurrency: { symbol: 'TRX', decimals: 6 },
};

// Test addresses and hashes by ecosystem
export const TEST_DATA = {
  evm: {
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    sender: '0x742d35cc6634c0532925a3b844bc9e7595f88e26',
    recipient: '0x8ba1f109551bd432803012645ac136ddd64dba72',
    usdtContract: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  },
  svm: {
    signature: '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW',
    sender: '7WtBwN7KUYrxbCkU7E5EWFiYxNWfjG8MXx7j6CZ1LD8i',
    recipient: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
  utxo: {
    txid: '7a91c3ae86cb1b6af2b0e5b9d5a7f3df38ac9e5c8e7b6d4c3f2e1a0b9c8d7e6f',
    sender: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    recipient: 'bc1q84h0tj9n5p8ph3x04w8d37a0xkjfs6xzwt7wt7',
  },
  tvm: {
    txid: '7a91c3ae86cb1b6af2b0e5b9d5a7f3df38ac9e5c8e7b6d4c3f2e1a0b9c8d7e6f',
    senderHex: '41742d35cc6634c0532925a3b844bc9e7595f88e26',
    recipientHex: '418ba1f109551bd432803012645ac136ddd64dba72',
    usdtContract: '41a614f803b6fd780986a42c78ec9c7f77e6ded13c',
  },
} as const;

// Token event topics (shared between EVM and TVM)
export const EVENT_TOPICS = {
  erc20Transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  erc1155TransferSingle: '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62',
  erc1155TransferBatch: '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb',
  trc20Transfer: 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
} as const;
