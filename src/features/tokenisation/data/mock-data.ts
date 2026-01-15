import type {
  BlocklistEntry,
  Token,
  TokenHolder,
  TokenOperation,
  TokenTransaction,
  WhitelistEntry,
} from '../schema';

export const MOCK_TOKENS: Token[] = [
  {
    id: 'tok-001',
    name: 'Digital Gold Token',
    symbol: 'DGT',
    standard: 'ERC-20',
    status: 'active',
    contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
    chainId: 1,
    chainName: 'Ethereum',
    decimals: 18,
    totalSupply: '1000000000000000000000000',
    circulatingSupply: '750000000000000000000000',
    holdersCount: 1247,
    transfersCount: 8934,
    deployedAt: '2024-01-15',
    deployedBy: 'admin@company.com',
    isPaused: false,
    isTransferable: true,
    hasWhitelist: true,
    hasBlocklist: true,
  },
  {
    id: 'tok-002',
    name: 'Real Estate Security Token',
    symbol: 'REST',
    standard: 'ERC-3643',
    status: 'active',
    contractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    chainId: 137,
    chainName: 'Polygon',
    decimals: 0,
    totalSupply: '10000',
    circulatingSupply: '8500',
    holdersCount: 342,
    transfersCount: 1205,
    deployedAt: '2024-03-22',
    deployedBy: 'treasury@company.com',
    isPaused: false,
    isTransferable: true,
    hasWhitelist: true,
    hasBlocklist: true,
  },
  {
    id: 'tok-003',
    name: 'Carbon Credit Token',
    symbol: 'CCT',
    standard: 'ERC-20',
    status: 'paused',
    contractAddress: '0x7890abcdef1234567890abcdef1234567890abcd',
    chainId: 1,
    chainName: 'Ethereum',
    decimals: 18,
    totalSupply: '5000000000000000000000000',
    circulatingSupply: '3200000000000000000000000',
    holdersCount: 567,
    transfersCount: 2341,
    deployedAt: '2024-02-08',
    deployedBy: 'admin@company.com',
    isPaused: true,
    isTransferable: false,
    hasWhitelist: false,
    hasBlocklist: true,
  },
  {
    id: 'tok-004',
    name: 'Private Equity Fund Token',
    symbol: 'PEFT',
    standard: 'ERC-3643',
    status: 'active',
    contractAddress: '0xdef1234567890abcdef1234567890abcdef123456',
    chainId: 42161,
    chainName: 'Arbitrum',
    decimals: 6,
    totalSupply: '500000000000',
    circulatingSupply: '425000000000',
    holdersCount: 89,
    transfersCount: 312,
    deployedAt: '2024-06-01',
    deployedBy: 'ops@company.com',
    isPaused: false,
    isTransferable: true,
    hasWhitelist: true,
    hasBlocklist: false,
  },
  {
    id: 'tok-005',
    name: 'Utility Rewards Token',
    symbol: 'URT',
    standard: 'ERC-20',
    status: 'deprecated',
    contractAddress: '0x567890abcdef1234567890abcdef1234567890ab',
    chainId: 1,
    chainName: 'Ethereum',
    decimals: 18,
    totalSupply: '100000000000000000000000000',
    circulatingSupply: '0',
    holdersCount: 0,
    transfersCount: 45678,
    deployedAt: '2023-06-15',
    deployedBy: 'admin@company.com',
    isPaused: true,
    isTransferable: false,
    hasWhitelist: false,
    hasBlocklist: false,
  },
];

export const MOCK_HOLDERS: TokenHolder[] = [
  {
    id: 'holder-001',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f1Eb85',
    balance: '250000000000000000000000',
    balanceUsd: '$12,500,000',
    percentage: 25.0,
    lastActivity: '2 hours ago',
    status: 'whitelisted',
    label: 'Treasury Reserve',
  },
  {
    id: 'holder-002',
    address: '0x8Ba1f109551bD432803012645Hd136dB7F6E3851',
    balance: '150000000000000000000000',
    balanceUsd: '$7,500,000',
    percentage: 15.0,
    lastActivity: '1 day ago',
    status: 'whitelisted',
    label: 'Liquidity Pool',
  },
  {
    id: 'holder-003',
    address: '0x9Cd7b1E3C7f4D5A6B8c9D0E1F2A3B4C5D6E7F8A9',
    balance: '75000000000000000000000',
    balanceUsd: '$3,750,000',
    percentage: 7.5,
    lastActivity: '3 days ago',
    status: 'whitelisted',
    label: 'Institutional Investor A',
  },
  {
    id: 'holder-004',
    address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    balance: '50000000000000000000000',
    balanceUsd: '$2,500,000',
    percentage: 5.0,
    lastActivity: '1 week ago',
    status: 'whitelisted',
  },
  {
    id: 'holder-005',
    address: '0xBc6e1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E',
    balance: '25000000000000000000000',
    balanceUsd: '$1,250,000',
    percentage: 2.5,
    lastActivity: '2 weeks ago',
    status: 'pending',
    label: 'New Investor',
  },
];

export const MOCK_WHITELIST: WhitelistEntry[] = [
  {
    id: 'wl-001',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f1Eb85',
    label: 'Treasury Reserve',
    addedAt: '2024-01-15',
    addedBy: 'admin@company.com',
    status: 'active',
  },
  {
    id: 'wl-002',
    address: '0x8Ba1f109551bD432803012645Hd136dB7F6E3851',
    label: 'Liquidity Pool',
    addedAt: '2024-01-15',
    addedBy: 'admin@company.com',
    status: 'active',
  },
  {
    id: 'wl-003',
    address: '0x9Cd7b1E3C7f4D5A6B8c9D0E1F2A3B4C5D6E7F8A9',
    label: 'Institutional Investor A',
    addedAt: '2024-02-20',
    addedBy: 'ops@company.com',
    expiresAt: '2025-02-20',
    status: 'active',
  },
  {
    id: 'wl-004',
    address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    addedAt: '2024-03-10',
    addedBy: 'ops@company.com',
    status: 'active',
  },
  {
    id: 'wl-005',
    address: '0xDe5F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F',
    label: 'Former Partner',
    addedAt: '2024-01-20',
    addedBy: 'admin@company.com',
    status: 'removed',
  },
];

export const MOCK_BLOCKLIST: BlocklistEntry[] = [
  {
    id: 'bl-001',
    address: '0xBadActor123456789abcdef0123456789abcdef01',
    label: 'Sanctioned Entity',
    reason: 'OFAC SDN List',
    blockedAt: '2024-02-01',
    blockedBy: 'compliance@company.com',
    status: 'blocked',
  },
  {
    id: 'bl-002',
    address: '0xSuspicious987654321fedcba987654321fedcba98',
    reason: 'Suspicious activity detected',
    blockedAt: '2024-03-15',
    blockedBy: 'compliance@company.com',
    status: 'blocked',
  },
  {
    id: 'bl-003',
    address: '0xFormer1234567890abcdef1234567890abcdef1234',
    label: 'Former Employee',
    reason: 'Employment terminated',
    blockedAt: '2024-01-30',
    blockedBy: 'hr@company.com',
    status: 'unblocked',
  },
];

export const MOCK_OPERATIONS: TokenOperation[] = [
  {
    id: 'op-001',
    type: 'mint',
    tokenId: 'tok-001',
    amount: '100000000000000000000000',
    toAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f1Eb85',
    txHash: '0x1234...abcd',
    status: 'confirmed',
    createdAt: '2024-06-15 14:30:00',
    createdBy: 'treasury@company.com',
    confirmedAt: '2024-06-15 14:32:15',
  },
  {
    id: 'op-002',
    type: 'burn',
    tokenId: 'tok-001',
    amount: '50000000000000000000000',
    fromAddress: '0x8Ba1f109551bD432803012645Hd136dB7F6E3851',
    txHash: '0x5678...efgh',
    status: 'confirmed',
    createdAt: '2024-06-14 09:15:00',
    createdBy: 'ops@company.com',
    confirmedAt: '2024-06-14 09:17:30',
  },
  {
    id: 'op-003',
    type: 'mint',
    tokenId: 'tok-001',
    amount: '25000000000000000000000',
    toAddress: '0x9Cd7b1E3C7f4D5A6B8c9D0E1F2A3B4C5D6E7F8A9',
    status: 'pending',
    createdAt: '2024-06-16 10:00:00',
    createdBy: 'treasury@company.com',
  },
];

export const CHAIN_OPTIONS = [
  { id: '1', label: 'Ethereum', icon: '⟠' },
  { id: '137', label: 'Polygon', icon: '⬡' },
  { id: '42161', label: 'Arbitrum', icon: '🔵' },
  { id: '10', label: 'Optimism', icon: '🔴' },
  { id: '8453', label: 'Base', icon: '🔷' },
];

export const TOKEN_STANDARD_OPTIONS = [
  { id: 'ERC-20', label: 'ERC-20', description: 'Fungible token standard' },
  { id: 'ERC-721', label: 'ERC-721', description: 'Non-fungible token (NFT)' },
  { id: 'ERC-1155', label: 'ERC-1155', description: 'Multi-token standard' },
  {
    id: 'ERC-3643',
    label: 'ERC-3643',
    description: 'Security token standard (T-REX)',
  },
];

export const MOCK_TRANSACTIONS: TokenTransaction[] = [
  {
    id: 'tx-001',
    type: 'mint',
    tokenId: 'tok-001',
    amount: '100000000000000000000000',
    toAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f1Eb85',
    txHash:
      '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
    status: 'confirmed',
    timestamp: '2024-06-15 14:32:15',
    blockNumber: 19234567,
    gasUsed: '52,341',
    initiatedBy: 'treasury@company.com',
  },
  {
    id: 'tx-002',
    type: 'transfer',
    tokenId: 'tok-001',
    amount: '25000000000000000000000',
    fromAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f1Eb85',
    toAddress: '0x8Ba1f109551bD432803012645Hd136dB7F6E3851',
    txHash:
      '0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab',
    status: 'confirmed',
    timestamp: '2024-06-15 10:15:42',
    blockNumber: 19234123,
    gasUsed: '45,200',
  },
  {
    id: 'tx-003',
    type: 'burn',
    tokenId: 'tok-001',
    amount: '50000000000000000000000',
    fromAddress: '0x8Ba1f109551bD432803012645Hd136dB7F6E3851',
    txHash:
      '0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
    status: 'confirmed',
    timestamp: '2024-06-14 09:17:30',
    blockNumber: 19233456,
    gasUsed: '48,123',
    initiatedBy: 'ops@company.com',
  },
  {
    id: 'tx-004',
    type: 'transfer',
    tokenId: 'tok-001',
    amount: '10000000000000000000000',
    fromAddress: '0x9Cd7b1E3C7f4D5A6B8c9D0E1F2A3B4C5D6E7F8A9',
    toAddress: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    txHash:
      '0x4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    status: 'confirmed',
    timestamp: '2024-06-13 16:45:00',
    blockNumber: 19232789,
    gasUsed: '44,890',
  },
  {
    id: 'tx-005',
    type: 'mint',
    tokenId: 'tok-001',
    amount: '25000000000000000000000',
    toAddress: '0x9Cd7b1E3C7f4D5A6B8c9D0E1F2A3B4C5D6E7F8A9',
    txHash:
      '0x5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
    status: 'pending',
    timestamp: '2024-06-16 10:00:00',
    initiatedBy: 'treasury@company.com',
  },
  {
    id: 'tx-006',
    type: 'transfer',
    tokenId: 'tok-001',
    amount: '5000000000000000000000',
    fromAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f1Eb85',
    toAddress: '0xBc6e1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E',
    txHash:
      '0x6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234',
    status: 'confirmed',
    timestamp: '2024-06-12 11:30:00',
    blockNumber: 19231567,
    gasUsed: '43,210',
  },
  {
    id: 'tx-007',
    type: 'burn',
    tokenId: 'tok-001',
    amount: '15000000000000000000000',
    fromAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f1Eb85',
    txHash:
      '0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
    status: 'failed',
    timestamp: '2024-06-11 14:20:00',
    initiatedBy: 'treasury@company.com',
  },
  {
    id: 'tx-008',
    type: 'transfer',
    tokenId: 'tok-001',
    amount: '75000000000000000000000',
    fromAddress: '0x8Ba1f109551bD432803012645Hd136dB7F6E3851',
    toAddress: '0x9Cd7b1E3C7f4D5A6B8c9D0E1F2A3B4C5D6E7F8A9',
    txHash:
      '0x890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
    status: 'confirmed',
    timestamp: '2024-06-10 09:00:00',
    blockNumber: 19230234,
    gasUsed: '46,500',
  },
  {
    id: 'tx-009',
    type: 'mint',
    tokenId: 'tok-001',
    amount: '200000000000000000000000',
    toAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f1Eb85',
    txHash:
      '0x90abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456789',
    status: 'confirmed',
    timestamp: '2024-06-08 15:45:00',
    blockNumber: 19228901,
    gasUsed: '54,120',
    initiatedBy: 'admin@company.com',
  },
  {
    id: 'tx-010',
    type: 'transfer',
    tokenId: 'tok-001',
    amount: '30000000000000000000000',
    fromAddress: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    toAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f1Eb85',
    txHash:
      '0x0abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    status: 'confirmed',
    timestamp: '2024-06-05 12:00:00',
    blockNumber: 19225678,
    gasUsed: '44,100',
  },
];

// Analytics types
export type SupplyDataPoint = {
  date: string;
  totalSupply: number;
  circulatingSupply: number;
};

export type TransactionVolumePoint = {
  date: string;
  mints: number;
  burns: number;
  transfers: number;
};

export type HolderGrowthPoint = {
  date: string;
  holders: number;
};

export type TokenAnalytics = {
  supplyHistory: SupplyDataPoint[];
  transactionVolume: TransactionVolumePoint[];
  holderGrowth: HolderGrowthPoint[];
};

// Seeded random number generator for consistent data
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Generate analytics data for a token
export function generateTokenAnalytics(tokenId: string): TokenAnalytics {
  // Use tokenId to seed random for consistent data per token
  const seedValue = tokenId
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = seededRandom(seedValue);

  const token = MOCK_TOKENS.find((t) => t.id === tokenId);
  const currentSupply = token
    ? Number(BigInt(token.totalSupply) / BigInt(10 ** token.decimals))
    : 1000000;
  const currentHolders = token?.holdersCount ?? 1000;

  const days = 90;
  const supplyHistory: SupplyDataPoint[] = [];
  const transactionVolume: TransactionVolumePoint[] = [];
  const holderGrowth: HolderGrowthPoint[] = [];

  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0] as string;

    // Supply grows over time with some variation
    const progress = (days - i) / days;
    const baseSupply = currentSupply * (0.7 + progress * 0.3);
    const variation = (random() - 0.5) * currentSupply * 0.02;
    const supply = Math.round(baseSupply + variation);
    const circulating = Math.round(supply * (0.7 + random() * 0.1));

    supplyHistory.push({
      date: dateStr,
      totalSupply: supply,
      circulatingSupply: circulating,
    });

    // Transaction volume varies by day
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseVolume = isWeekend ? 5 : 15;
    const mints = Math.floor(random() * baseVolume * 0.3);
    const burns = Math.floor(random() * baseVolume * 0.2);
    const transfers = Math.floor(random() * baseVolume);

    transactionVolume.push({
      date: dateStr,
      mints,
      burns,
      transfers,
    });

    // Holder count grows steadily
    const holderProgress = (days - i) / days;
    const baseHolders = currentHolders * (0.6 + holderProgress * 0.4);
    const holderVariation = Math.floor((random() - 0.3) * 5);
    const holders = Math.max(1, Math.round(baseHolders) + holderVariation);

    holderGrowth.push({
      date: dateStr,
      holders,
    });
  }

  return {
    supplyHistory,
    transactionVolume,
    holderGrowth,
  };
}
