import { type RiskLevel } from '@/features/compliance';
import { type Chain } from '../constants';

export interface WatchedAddress {
  address: string;
  label?: string;
  chain: Chain;
  riskLevel: RiskLevel;
  transactionCount: number;
  totalVolume: string;
  token: string;
  lastActivity: Date;
  isWatchlisted: boolean;
  tags: string[];
}

export const mockAddresses: WatchedAddress[] = [
  {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    label: 'Main Treasury',
    chain: 'ethereum',
    riskLevel: 'low',
    transactionCount: 156,
    totalVolume: '2,450,000',
    token: 'USDC',
    lastActivity: new Date(Date.now() - 3600000),
    isWatchlisted: false,
    tags: ['internal', 'treasury'],
  },
  {
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    label: 'Hot Wallet',
    chain: 'ethereum',
    riskLevel: 'medium',
    transactionCount: 423,
    totalVolume: '890,000',
    token: 'ETH',
    lastActivity: new Date(Date.now() - 7200000),
    isWatchlisted: false,
    tags: ['internal', 'hot-wallet'],
  },
  {
    address: '0x9876543210fedcba9876543210fedcba98765432',
    chain: 'polygon',
    riskLevel: 'high',
    transactionCount: 12,
    totalVolume: '125,000',
    token: 'USDT',
    lastActivity: new Date(Date.now() - 86400000),
    isWatchlisted: true,
    tags: ['watchlist', 'high-risk'],
  },
  {
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    label: 'BTC Cold Storage',
    chain: 'bitcoin',
    riskLevel: 'low',
    transactionCount: 24,
    totalVolume: '45.5',
    token: 'BTC',
    lastActivity: new Date(Date.now() - 172800000),
    isWatchlisted: false,
    tags: ['internal', 'cold-storage'],
  },
  {
    address: '0xfedcba9876543210fedcba9876543210fedcba98',
    chain: 'arbitrum',
    riskLevel: 'severe',
    transactionCount: 3,
    totalVolume: '500,000',
    token: 'USDC',
    lastActivity: new Date(Date.now() - 259200000),
    isWatchlisted: true,
    tags: ['watchlist', 'sanctioned'],
  },
];
