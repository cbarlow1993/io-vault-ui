export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  pending_l1: 'Pending L1',
  under_l1_review: 'Under L1 Review',
  pending_l2: 'Pending L2',
  under_l2_review: 'Under L2 Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const RISK_LEVEL_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  severe: 'Severe',
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  receive: 'Receive',
  send: 'Send',
  swap: 'Swap',
};

export const PROVIDER_LABELS: Record<string, string> = {
  chainanalysis: 'ChainAnalysis',
  elliptic: 'Elliptic',
  scorechain: 'Scorechain',
};

export const CHAINS = [
  'ethereum',
  'bitcoin',
  'polygon',
  'arbitrum',
  'optimism',
  'avalanche',
  'solana',
] as const;

export type Chain = (typeof CHAINS)[number];

export const CHAIN_LABELS: Record<Chain, string> = {
  ethereum: 'Ethereum',
  bitcoin: 'Bitcoin',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  avalanche: 'Avalanche',
  solana: 'Solana',
};

// Alias for STATUS_LABELS
export const STATUS_LABELS = TRANSACTION_STATUS_LABELS;
