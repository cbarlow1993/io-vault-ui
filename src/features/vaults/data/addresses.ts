// Address data types and sample data

export type ChainId =
  | 'bitcoin'
  | 'ethereum'
  | 'solana'
  | 'xrp'
  | 'arbitrum'
  | 'polygon'
  | 'base'
  | 'optimism'
  | 'avalanche';

export type Chain = {
  id: ChainId;
  name: string;
  symbol: string;
  curveType: 'ECDSA' | 'EdDSA';
  color: string;
  explorerUrl: string;
};

export const chains: Chain[] = [
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    curveType: 'ECDSA',
    color: '#F7931A',
    explorerUrl: 'https://blockstream.info',
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    curveType: 'ECDSA',
    color: '#627EEA',
    explorerUrl: 'https://etherscan.io',
  },
  {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    curveType: 'EdDSA',
    color: '#9945FF',
    explorerUrl: 'https://solscan.io',
  },
  {
    id: 'xrp',
    name: 'XRP Ledger',
    symbol: 'XRP',
    curveType: 'EdDSA',
    color: '#23292F',
    explorerUrl: 'https://xrpscan.com',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    symbol: 'ARB',
    curveType: 'ECDSA',
    color: '#28A0F0',
    explorerUrl: 'https://arbiscan.io',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    curveType: 'ECDSA',
    color: '#8247E5',
    explorerUrl: 'https://polygonscan.com',
  },
  {
    id: 'base',
    name: 'Base',
    symbol: 'ETH',
    curveType: 'ECDSA',
    color: '#0052FF',
    explorerUrl: 'https://basescan.org',
  },
  {
    id: 'optimism',
    name: 'Optimism',
    symbol: 'OP',
    curveType: 'ECDSA',
    color: '#FF0420',
    explorerUrl: 'https://optimistic.etherscan.io',
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    symbol: 'AVAX',
    curveType: 'ECDSA',
    color: '#E84142',
    explorerUrl: 'https://snowtrace.io',
  },
];

export const getChainById = (id: ChainId): Chain | undefined => {
  return chains.find((chain) => chain.id === id);
};

export type AddressType = 'root' | 'derived';

export type Asset = {
  id: string;
  symbol: string;
  name: string;
  contractAddress?: string; // undefined for native tokens
  balance: string;
  balanceUsd: string;
  decimals: number;
  logoUrl?: string;
  isSpam: boolean;
  isHidden: boolean;
  priceUsd: string;
  change24h: number; // percentage
};

export type TransactionDirection = 'inbound' | 'outbound';
export type TransactionStatus = 'confirmed' | 'pending' | 'failed';

export type Transaction = {
  id: string;
  hash: string;
  direction: TransactionDirection;
  status: TransactionStatus;
  asset: string;
  amount: string;
  amountUsd: string;
  from: string;
  to: string;
  timestamp: string;
  blockNumber?: number;
  fee?: string;
  feeUsd?: string;
  signatureId?: string; // Links to vault signature for outbound
  memo?: string;
};

export type Address = {
  id: string;
  vaultId: string;
  chainId: ChainId;
  address: string;
  type: AddressType;
  derivationPath?: string; // e.g., "m/44'/60'/0'/0/0" for derived
  alias?: string;
  identityId?: string;
  createdAt: string;
  createdBy: string;
  assets: Asset[];
  transactions: Transaction[];
};

// Sample addresses
export const allAddresses: Address[] = [
  // Production Signing Vault (vault-001) addresses
  {
    id: 'addr-001',
    vaultId: 'vault-001',
    chainId: 'ethereum',
    address: '0x7a3f8c2d9e1b4a7f6c3d8e2a1b5c9d4e7f2a8b3c',
    type: 'root',
    alias: 'Main Treasury',
    identityId: 'corp-001',
    createdAt: '2025-01-10',
    createdBy: 'J. Doe',
    assets: [
      {
        id: 'asset-001',
        symbol: 'ETH',
        name: 'Ethereum',
        balance: '125.4523',
        balanceUsd: '$422,524.25',
        decimals: 18,
        isSpam: false,
        isHidden: false,
        priceUsd: '$3,368.45',
        change24h: 2.34,
      },
      {
        id: 'asset-002',
        symbol: 'USDC',
        name: 'USD Coin',
        contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        balance: '1,250,000.00',
        balanceUsd: '$1,250,000.00',
        decimals: 6,
        isSpam: false,
        isHidden: false,
        priceUsd: '$1.00',
        change24h: 0.01,
      },
      {
        id: 'asset-003',
        symbol: 'USDT',
        name: 'Tether',
        contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        balance: '500,000.00',
        balanceUsd: '$500,000.00',
        decimals: 6,
        isSpam: false,
        isHidden: false,
        priceUsd: '$1.00',
        change24h: -0.02,
      },
      {
        id: 'asset-004',
        symbol: 'WBTC',
        name: 'Wrapped Bitcoin',
        contractAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        balance: '5.2341',
        balanceUsd: '$494,822.45',
        decimals: 8,
        isSpam: false,
        isHidden: false,
        priceUsd: '$94,560.00',
        change24h: 1.85,
      },
      {
        id: 'asset-spam-001',
        symbol: 'SCAM',
        name: 'Free Airdrop Token',
        contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
        balance: '1,000,000.00',
        balanceUsd: '$0.00',
        decimals: 18,
        isSpam: true,
        isHidden: false,
        priceUsd: '$0.00',
        change24h: 0,
      },
      {
        id: 'asset-hidden-001',
        symbol: 'OLD',
        name: 'Deprecated Token',
        contractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        balance: '50.00',
        balanceUsd: '$2.50',
        decimals: 18,
        isSpam: false,
        isHidden: true,
        priceUsd: '$0.05',
        change24h: -15.2,
      },
    ],
    transactions: [
      {
        id: 'tx-001',
        hash: '0x8f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
        direction: 'outbound',
        status: 'confirmed',
        asset: 'ETH',
        amount: '15.5',
        amountUsd: '$52,234.50',
        from: '0x7a3f8c2d9e1b4a7f6c3d8e2a1b5c9d4e7f2a8b3c',
        to: '0x8a2f4c1e9d3b7a6f5c2e8d1a4b9c6e3f7d2a5b8c',
        timestamp: '2025-01-14 14:32:00',
        blockNumber: 19234567,
        fee: '0.0021',
        feeUsd: '$7.08',
        signatureId: 'sig-001',
        memo: 'Q1 treasury disbursement',
      },
      {
        id: 'tx-002',
        hash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        direction: 'inbound',
        status: 'confirmed',
        asset: 'USDC',
        amount: '100,000.00',
        amountUsd: '$100,000.00',
        from: '0x9b3f7c2e8d1a4b5c6e3f9a2b5c8d1e4f7a0b3c6d',
        to: '0x7a3f8c2d9e1b4a7f6c3d8e2a1b5c9d4e7f2a8b3c',
        timestamp: '2025-01-14 10:15:00',
        blockNumber: 19234123,
        fee: '0.0015',
        feeUsd: '$5.05',
      },
      {
        id: 'tx-003',
        hash: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
        direction: 'outbound',
        status: 'pending',
        asset: 'ETH',
        amount: '5.0',
        amountUsd: '$16,842.25',
        from: '0x7a3f8c2d9e1b4a7f6c3d8e2a1b5c9d4e7f2a8b3c',
        to: '0x4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d',
        timestamp: '2025-01-14 15:45:00',
        signatureId: 'op-001',
        memo: 'Partner payment',
      },
    ],
  },
  {
    id: 'addr-002',
    vaultId: 'vault-001',
    chainId: 'ethereum',
    address: '0x8b4f9c3e0a2d5b7c8e1f4a6d9c2e5b8f1a4d7c0e',
    type: 'derived',
    derivationPath: "m/44'/60'/0'/0/1",
    alias: 'Operations Wallet',
    createdAt: '2025-01-11',
    createdBy: 'J. Doe',
    assets: [
      {
        id: 'asset-005',
        symbol: 'ETH',
        name: 'Ethereum',
        balance: '12.3456',
        balanceUsd: '$41,578.92',
        decimals: 18,
        isSpam: false,
        isHidden: false,
        priceUsd: '$3,368.45',
        change24h: 2.34,
      },
      {
        id: 'asset-006',
        symbol: 'USDC',
        name: 'USD Coin',
        contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        balance: '75,000.00',
        balanceUsd: '$75,000.00',
        decimals: 6,
        isSpam: false,
        isHidden: false,
        priceUsd: '$1.00',
        change24h: 0.01,
      },
    ],
    transactions: [
      {
        id: 'tx-004',
        hash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
        direction: 'inbound',
        status: 'confirmed',
        asset: 'ETH',
        amount: '10.0',
        amountUsd: '$33,684.50',
        from: '0x7a3f8c2d9e1b4a7f6c3d8e2a1b5c9d4e7f2a8b3c',
        to: '0x8b4f9c3e0a2d5b7c8e1f4a6d9c2e5b8f1a4d7c0e',
        timestamp: '2025-01-12 09:30:00',
        blockNumber: 19230456,
      },
    ],
  },
  {
    id: 'addr-003',
    vaultId: 'vault-001',
    chainId: 'solana',
    address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    type: 'root',
    alias: 'Solana Treasury',
    identityId: 'corp-001',
    createdAt: '2025-01-10',
    createdBy: 'J. Doe',
    assets: [
      {
        id: 'asset-007',
        symbol: 'SOL',
        name: 'Solana',
        balance: '1,250.5678',
        balanceUsd: '$262,619.23',
        decimals: 9,
        isSpam: false,
        isHidden: false,
        priceUsd: '$210.00',
        change24h: 3.45,
      },
      {
        id: 'asset-008',
        symbol: 'USDC',
        name: 'USD Coin (SPL)',
        contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        balance: '500,000.00',
        balanceUsd: '$500,000.00',
        decimals: 6,
        isSpam: false,
        isHidden: false,
        priceUsd: '$1.00',
        change24h: 0.0,
      },
    ],
    transactions: [
      {
        id: 'tx-005',
        hash: '5UfDuX7hXs9mZ...truncated',
        direction: 'outbound',
        status: 'confirmed',
        asset: 'SOL',
        amount: '100.0',
        amountUsd: '$21,000.00',
        from: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        to: '9yQXtg3CW98e08UYJSDqbE6kCkhfUrB94UZSuKphBtV',
        timestamp: '2025-01-13 09:45:00',
        fee: '0.000005',
        feeUsd: '$0.001',
        signatureId: 'sig-003',
      },
    ],
  },
  {
    id: 'addr-004',
    vaultId: 'vault-001',
    chainId: 'bitcoin',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    type: 'root',
    alias: 'BTC Cold Storage',
    createdAt: '2025-01-10',
    createdBy: 'J. Doe',
    assets: [
      {
        id: 'asset-009',
        symbol: 'BTC',
        name: 'Bitcoin',
        balance: '15.78234',
        balanceUsd: '$1,492,501.30',
        decimals: 8,
        isSpam: false,
        isHidden: false,
        priceUsd: '$94,560.00',
        change24h: 1.85,
      },
    ],
    transactions: [
      {
        id: 'tx-006',
        hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
        direction: 'inbound',
        status: 'confirmed',
        asset: 'BTC',
        amount: '5.0',
        amountUsd: '$472,800.00',
        from: 'bc1q9h5yjfkz2c9e0tyd3rqn8v4g5l8yqjxqhqz6m5',
        to: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        timestamp: '2025-01-08 14:00:00',
        blockNumber: 876543,
        fee: '0.00012',
        feeUsd: '$11.35',
      },
    ],
  },
  {
    id: 'addr-005',
    vaultId: 'vault-001',
    chainId: 'arbitrum',
    address: '0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    type: 'root',
    alias: 'Arbitrum Operations',
    createdAt: '2025-01-12',
    createdBy: 'M. Smith',
    assets: [
      {
        id: 'asset-010',
        symbol: 'ETH',
        name: 'Ethereum',
        balance: '45.6789',
        balanceUsd: '$153,852.34',
        decimals: 18,
        isSpam: false,
        isHidden: false,
        priceUsd: '$3,368.45',
        change24h: 2.34,
      },
      {
        id: 'asset-011',
        symbol: 'ARB',
        name: 'Arbitrum',
        contractAddress: '0x912ce59144191c1204e64559fe8253a0e49e6548',
        balance: '125,000.00',
        balanceUsd: '$112,500.00',
        decimals: 18,
        isSpam: false,
        isHidden: false,
        priceUsd: '$0.90',
        change24h: -1.23,
      },
    ],
    transactions: [],
  },
  // Treasury Operations vault (vault-002) addresses
  {
    id: 'addr-006',
    vaultId: 'vault-002',
    chainId: 'ethereum',
    address: '0x2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f',
    type: 'root',
    alias: 'Treasury Main',
    identityId: 'corp-002',
    createdAt: '2025-01-08',
    createdBy: 'M. Smith',
    assets: [
      {
        id: 'asset-012',
        symbol: 'ETH',
        name: 'Ethereum',
        balance: '250.1234',
        balanceUsd: '$842,340.89',
        decimals: 18,
        isSpam: false,
        isHidden: false,
        priceUsd: '$3,368.45',
        change24h: 2.34,
      },
      {
        id: 'asset-013',
        symbol: 'USDC',
        name: 'USD Coin',
        contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        balance: '5,000,000.00',
        balanceUsd: '$5,000,000.00',
        decimals: 6,
        isSpam: false,
        isHidden: false,
        priceUsd: '$1.00',
        change24h: 0.01,
      },
    ],
    transactions: [
      {
        id: 'tx-007',
        hash: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
        direction: 'outbound',
        status: 'confirmed',
        asset: 'USDC',
        amount: '250,000.00',
        amountUsd: '$250,000.00',
        from: '0x2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f',
        to: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
        timestamp: '2025-01-13 11:00:00',
        blockNumber: 19231234,
        fee: '0.0018',
        feeUsd: '$6.06',
        signatureId: 'sig-005',
        memo: 'Treasury disbursement',
      },
    ],
  },
  {
    id: 'addr-007',
    vaultId: 'vault-002',
    chainId: 'polygon',
    address: '0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a',
    type: 'root',
    alias: 'Polygon Treasury',
    createdAt: '2025-01-09',
    createdBy: 'M. Smith',
    assets: [
      {
        id: 'asset-014',
        symbol: 'MATIC',
        name: 'Polygon',
        balance: '500,000.00',
        balanceUsd: '$225,000.00',
        decimals: 18,
        isSpam: false,
        isHidden: false,
        priceUsd: '$0.45',
        change24h: -0.85,
      },
      {
        id: 'asset-015',
        symbol: 'USDC',
        name: 'USD Coin (Polygon)',
        contractAddress: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        balance: '100,000.00',
        balanceUsd: '$100,000.00',
        decimals: 6,
        isSpam: false,
        isHidden: false,
        priceUsd: '$1.00',
        change24h: 0.0,
      },
    ],
    transactions: [],
  },
  {
    id: 'addr-008',
    vaultId: 'vault-002',
    chainId: 'xrp',
    address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    type: 'root',
    alias: 'XRP Ledger Account',
    createdAt: '2025-01-10',
    createdBy: 'M. Smith',
    assets: [
      {
        id: 'asset-016',
        symbol: 'XRP',
        name: 'XRP',
        balance: '1,000,000.00',
        balanceUsd: '$2,350,000.00',
        decimals: 6,
        isSpam: false,
        isHidden: false,
        priceUsd: '$2.35',
        change24h: 4.12,
      },
    ],
    transactions: [],
  },
];

// Helper functions
export const getAddressesByVaultId = (vaultId: string): Address[] => {
  return allAddresses.filter((addr) => addr.vaultId === vaultId);
};

export const getAddressById = (addressId: string): Address | undefined => {
  return allAddresses.find((addr) => addr.id === addressId);
};

export const getAddressesByChain = (chainId: ChainId): Address[] => {
  return allAddresses.filter((addr) => addr.chainId === chainId);
};

export const getAddressesByIdentityId = (identityId: string): Address[] => {
  return allAddresses.filter((addr) => addr.identityId === identityId);
};

// Calculate total balance for an address
export const getAddressTotalBalance = (address: Address): string => {
  const visibleAssets = address.assets.filter((a) => !a.isSpam && !a.isHidden);
  const total = visibleAssets.reduce((sum, asset) => {
    const value = parseFloat(asset.balanceUsd.replace(/[$,]/g, ''));
    return sum + value;
  }, 0);
  return `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
