import {
  type ComplianceTransaction,
  type ProviderAssessment,
} from '@/features/compliance';

interface TimelineEvent {
  id: string;
  type:
    | 'submitted'
    | 'claimed'
    | 'note'
    | 'escalated'
    | 'approved'
    | 'rejected';
  actor?: string;
  message?: string;
  timestamp: Date;
}

export interface TransactionDetail extends ComplianceTransaction {
  timeline: TimelineEvent[];
  notes: Array<{
    id: string;
    author: string;
    content: string;
    timestamp: Date;
  }>;
}

export const mockProviderAssessments: ProviderAssessment[] = [
  {
    provider: 'chainanalysis',
    riskScore: 78,
    riskLevel: 'high',
    categories: ['Darknet Market', 'Mixer'],
    flags: [
      'Known mixer address detected',
      'Indirect exposure to sanctioned entity',
    ],
    lastChecked: new Date(Date.now() - 300000),
  },
  {
    provider: 'elliptic',
    riskScore: 72,
    riskLevel: 'high',
    categories: ['Illicit Services', 'High Risk Exchange'],
    flags: ['Transaction traced to high-risk exchange'],
    lastChecked: new Date(Date.now() - 300000),
  },
  {
    provider: 'scorechain',
    riskScore: 65,
    riskLevel: 'medium',
    categories: ['Gambling', 'Unhosted Wallet'],
    flags: [],
    lastChecked: new Date(Date.now() - 300000),
  },
];

export const mockTimelineEvents: TimelineEvent[] = [
  {
    id: '1',
    type: 'submitted',
    timestamp: new Date(Date.now() - 7200000),
  },
  {
    id: '2',
    type: 'claimed',
    actor: 'John D.',
    timestamp: new Date(Date.now() - 6000000),
  },
  {
    id: '3',
    type: 'note',
    actor: 'John D.',
    message: 'Checking counterparty wallet history for additional context.',
    timestamp: new Date(Date.now() - 5400000),
  },
  {
    id: '4',
    type: 'escalated',
    actor: 'John D.',
    message:
      'Multiple high-risk flags from providers. Escalating for L2 review.',
    timestamp: new Date(Date.now() - 3600000),
  },
];

export const mockTransactionDetail: TransactionDetail = {
  id: '1',
  hash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
  type: 'send',
  amount: '125.5',
  token: 'ETH',
  chain: 'ethereum',
  fromAddress: '0xSender1234567890abcdef1234567890abcdef12',
  toAddress: '0xReceiver234567890abcdef1234567890abcdef12',
  status: 'pending_l2',
  riskLevel: 'high',
  submittedAt: new Date(Date.now() - 7200000),
  reviewerId: 'John D.',
  assessments: mockProviderAssessments,
  timeline: mockTimelineEvents,
  notes: [
    {
      id: '1',
      author: 'John D.',
      content: 'Checking counterparty wallet history for additional context.',
      timestamp: new Date(Date.now() - 5400000),
    },
    {
      id: '2',
      author: 'John D.',
      content:
        'Multiple high-risk flags from providers. Escalating for L2 review.',
      timestamp: new Date(Date.now() - 3600000),
    },
  ],
};
