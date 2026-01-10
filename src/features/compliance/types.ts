export type TransactionType = 'receive' | 'send' | 'swap';

export type TransactionStatus =
  | 'pending_l1'
  | 'under_l1_review'
  | 'pending_l2'
  | 'under_l2_review'
  | 'approved'
  | 'rejected';

export type RiskLevel = 'low' | 'medium' | 'high' | 'severe';

export type ComplianceProvider = 'chainanalysis' | 'elliptic' | 'scorechain';

export type AlertTrigger =
  | 'transaction_pending'
  | 'transaction_escalated'
  | 'high_risk_detected'
  | 'transaction_approved'
  | 'transaction_rejected'
  | 'watchlist_activity';

export interface ProviderAssessment {
  provider: ComplianceProvider;
  riskScore: number;
  riskLevel: RiskLevel;
  categories: string[];
  flags: string[];
  lastChecked: Date;
}

export interface ComplianceTransaction {
  id: string;
  hash: string;
  type: TransactionType;
  amount: string;
  token: string;
  chain: string;
  fromAddress: string;
  toAddress: string;
  status: TransactionStatus;
  riskLevel: RiskLevel;
  submittedAt: Date;
  reviewerId?: string;
  assessments: ProviderAssessment[];
}

export interface ComplianceAddress {
  id: string;
  address: string;
  chain: string;
  riskLevel: RiskLevel;
  transactionCount: number;
  lastActivity: Date;
  isWatchlisted: boolean;
  assessments: ProviderAssessment[];
}
