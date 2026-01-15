import {
  type ComplianceTransaction,
  type ProviderAssessment,
} from '@/features/compliance';

import type { WatchedAddress } from './mock-addresses';

export interface AddressDossier extends WatchedAddress {
  assessments: ProviderAssessment[];
  recentTransactions: ComplianceTransaction[];
  relatedAddresses: Array<{
    address: string;
    relationship: string;
    transactionCount: number;
  }>;
  notes: Array<{
    id: string;
    author: string;
    content: string;
    timestamp: Date;
  }>;
}

export const mockAddressDossier: AddressDossier = {
  address: '0x9876543210fedcba9876543210fedcba98765432',
  chain: 'polygon',
  riskLevel: 'high',
  transactionCount: 12,
  totalVolume: '125,000',
  token: 'USDT',
  lastActivity: new Date(Date.now() - 86400000),
  isWatchlisted: true,
  tags: ['watchlist', 'high-risk'],
  assessments: [
    {
      provider: 'chainanalysis',
      riskScore: 82,
      riskLevel: 'high',
      categories: ['Mixer', 'High Risk Exchange'],
      flags: [
        'Indirect exposure to sanctioned entity',
        'Mixer activity detected',
      ],
      lastChecked: new Date(Date.now() - 600000),
    },
    {
      provider: 'elliptic',
      riskScore: 76,
      riskLevel: 'high',
      categories: ['Illicit Services'],
      flags: ['Connected to known fraud address'],
      lastChecked: new Date(Date.now() - 600000),
    },
    {
      provider: 'scorechain',
      riskScore: 68,
      riskLevel: 'medium',
      categories: ['Unhosted Wallet'],
      flags: [],
      lastChecked: new Date(Date.now() - 600000),
    },
  ],
  recentTransactions: [
    {
      id: 'tx1',
      hash: '0xabc123def456789',
      type: 'receive',
      amount: '50,000',
      token: 'USDT',
      chain: 'polygon',
      fromAddress: '0xexternal111222333444555666777888999000aaa',
      toAddress: '0x9876543210fedcba9876543210fedcba98765432',
      status: 'approved',
      riskLevel: 'medium',
      submittedAt: new Date(Date.now() - 86400000),
      assessments: [],
    },
    {
      id: 'tx2',
      hash: '0xdef789abc123456',
      type: 'send',
      amount: '25,000',
      token: 'USDT',
      chain: 'polygon',
      fromAddress: '0x9876543210fedcba9876543210fedcba98765432',
      toAddress: '0xexternal999888777666555444333222111000bbb',
      status: 'rejected',
      riskLevel: 'high',
      submittedAt: new Date(Date.now() - 172800000),
      assessments: [],
    },
  ],
  relatedAddresses: [
    {
      address: '0xexternal111222333444555666777888999000aaa',
      relationship: 'Sender',
      transactionCount: 5,
    },
    {
      address: '0xexternal999888777666555444333222111000bbb',
      relationship: 'Recipient',
      transactionCount: 3,
    },
    {
      address: '0xmixer000111222333444555666777888999aaabbb',
      relationship: 'Connected via mixer',
      transactionCount: 1,
    },
  ],
  notes: [
    {
      id: '1',
      author: 'Sarah M.',
      content:
        'Address added to watchlist due to suspicious activity patterns.',
      timestamp: new Date(Date.now() - 604800000),
    },
    {
      id: '2',
      author: 'John D.',
      content:
        'Confirmed connection to mixer service. Recommend blocking all transactions.',
      timestamp: new Date(Date.now() - 259200000),
    },
  ],
};
