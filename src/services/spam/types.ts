// services/core/src/services/spam/types.ts

import type { TokenScanResponse } from '@blockaid/client/resources/token.js';

export interface BlockaidClassification {
  isMalicious: boolean;
  isPhishing: boolean;
  riskScore: number | null;
  attackTypes: string[];
  checkedAt: string;
  resultType: 'Benign' | 'Warning' | 'Malicious' | 'Spam';
  rawResponse: TokenScanResponse | null;
}

export interface CoingeckoClassification {
  isListed: boolean;
  marketCapRank: number | null;
}

export interface HeuristicsClassification {
  suspiciousName: boolean;
  namePatterns: string[];
  isUnsolicited: boolean;
  contractAgeDays: number | null;
  isNewContract: boolean;
  holderDistribution: 'normal' | 'suspicious' | 'unknown';
}

export interface SpamClassification {
  blockaid: BlockaidClassification | null;
  coingecko: CoingeckoClassification;
  heuristics: HeuristicsClassification;
}

export interface SpamAnalysis {
  blockaid: BlockaidClassification | null;
  coingecko: CoingeckoClassification;
  heuristics: HeuristicsClassification;
  userOverride: 'trusted' | 'spam' | null;
  classificationUpdatedAt: string | null;
  summary: {
    riskLevel: 'safe' | 'warning' | 'danger';
    reasons: string[];
  };
}

export interface TokenToClassify {
  chain: string;
  network: string;
  address: string;
  name: string;
  symbol: string;
  coingeckoId: string | null;
}

export interface ClassificationResult {
  tokenAddress: string;
  classification: SpamClassification;
  updatedAt: Date;
}

export interface SpamClassificationProvider {
  readonly name: string;
  classify(token: TokenToClassify): Promise<Partial<SpamClassification>>;
  classifyBatch?(tokens: TokenToClassify[]): Promise<Map<string, Partial<SpamClassification>>>;
}
