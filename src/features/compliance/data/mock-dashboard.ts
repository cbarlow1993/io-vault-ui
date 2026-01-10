import { type RiskLevel } from '@/features/compliance';

export const mockDashboardMetrics = {
  pendingL1: 12,
  pendingL2: 3,
  avgReviewTime: '4.2h',
  approvalRate: 87,
  highRiskAlerts: 5,
};

export const mockRecentActivities = [
  {
    id: '1',
    type: 'approved' as const,
    transactionHash: '0x1a2b3c4d5e6f...',
    actor: 'John D.',
    timestamp: new Date(),
  },
  {
    id: '2',
    type: 'escalated' as const,
    transactionHash: '0x2b3c4d5e6f7a...',
    actor: 'Sarah M.',
    timestamp: new Date(Date.now() - 15 * 60000),
  },
  {
    id: '3',
    type: 'rejected' as const,
    transactionHash: '0x3c4d5e6f7a8b...',
    actor: 'John D.',
    timestamp: new Date(Date.now() - 45 * 60000),
  },
  {
    id: '4',
    type: 'note_added' as const,
    transactionHash: '0x4d5e6f7a8b9c...',
    actor: 'Mike R.',
    timestamp: new Date(Date.now() - 60 * 60000),
  },
  {
    id: '5',
    type: 'approved' as const,
    transactionHash: '0x5e6f7a8b9c0d...',
    actor: 'Sarah M.',
    timestamp: new Date(Date.now() - 90 * 60000),
  },
];

export const mockAttentionItems = [
  {
    id: '1',
    transactionHash: '0xabc123def456...',
    amount: '125.5',
    token: 'ETH',
    riskLevel: 'high' as RiskLevel,
    waitingTime: '2h 15m',
    isAutoEscalated: true,
  },
  {
    id: '2',
    transactionHash: '0xdef456abc789...',
    amount: '50,000',
    token: 'USDC',
    riskLevel: 'medium' as RiskLevel,
    waitingTime: '1h 45m',
    isAutoEscalated: false,
  },
  {
    id: '3',
    transactionHash: '0x789abc123def...',
    amount: '2.3',
    token: 'BTC',
    riskLevel: 'severe' as RiskLevel,
    waitingTime: '45m',
    isAutoEscalated: true,
  },
  {
    id: '4',
    transactionHash: '0x456def789abc...',
    amount: '10,000',
    token: 'USDT',
    riskLevel: 'low' as RiskLevel,
    waitingTime: '30m',
    isAutoEscalated: false,
  },
];
