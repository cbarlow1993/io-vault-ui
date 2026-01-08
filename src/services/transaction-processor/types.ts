import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

/**
 * Classification types for transactions.
 */
export type ClassificationType =
  | 'transfer'
  | 'swap'
  | 'bridge'
  | 'stake'
  | 'mint'
  | 'burn'
  | 'approve'
  | 'contract_deploy'
  | 'nft_transfer'
  | 'unknown';

/**
 * Confidence level of the classification.
 */
export type ClassificationConfidence = 'high' | 'medium' | 'low';

/**
 * Source of the classification result.
 */
export type ClassificationSource = 'custom' | 'noves';

/**
 * Direction of the transaction from the perspective of a specific address.
 */
export type ClassificationDirection = 'in' | 'out' | 'neutral';

/**
 * Options for classifying a transaction.
 */
export interface ClassifyOptions {
  /** Address to calculate direction from */
  perspectiveAddress: string;
  /** Chain alias (e.g., 'ethereum-mainnet', 'polygon-mainnet') - used for external API lookups */
  chainAlias?: ChainAlias;
}

/**
 * Token information extracted from a transfer.
 */
export interface TokenInfo {
  address: string;
  symbol?: string;
  name?: string;
  decimals?: number;
}

/**
 * A parsed transfer from a transaction.
 */
export interface ParsedTransfer {
  type: 'native' | 'token' | 'nft';
  direction: 'in' | 'out';
  from: string;
  to: string;
  amount: string;
  token?: TokenInfo;
  tokenId?: string; // For NFTs
}

/**
 * Result of classifying a transaction.
 */
export interface ClassificationResult {
  type: ClassificationType;
  direction: ClassificationDirection;
  confidence: ClassificationConfidence;
  source: ClassificationSource;
  label: string;
  protocol?: string;
  transfers: ParsedTransfer[];
}

/**
 * EVM-specific transaction data for classification.
 */
export interface EvmTransactionData {
  type: 'evm';
  hash: string;
  from: string;
  to: string | null;
  value: string;
  input: string;
  gasUsed: string;
  gasPrice: string;
  logs: EvmTransactionLog[];
  blockNumber: number;
  blockHash: string;
  timestamp: Date;
  status: 'success' | 'failed';
}

/**
 * EVM transaction log (event).
 */
export interface EvmTransactionLog {
  address: string;
  topics: string[];
  data: string;
  logIndex: number;
}

/**
 * SVM-specific transaction data for classification.
 */
export interface SvmTransactionData {
  type: 'svm';
  signature: string;
  slot: number;
  blockTime: number;
  /** Fee in lamports (stored as string to avoid precision loss) */
  fee: string;
  status: 'success' | 'failed';
  instructions: SvmInstruction[];
  /** Pre-transaction balances in lamports (stored as strings to avoid precision loss) */
  preBalances: string[];
  /** Post-transaction balances in lamports (stored as strings to avoid precision loss) */
  postBalances: string[];
  preTokenBalances: SvmTokenBalance[];
  postTokenBalances: SvmTokenBalance[];
}

/**
 * SVM instruction.
 */
export interface SvmInstruction {
  programId: string;
  accounts: string[];
  data: string;
}

/**
 * SVM token balance.
 */
export interface SvmTokenBalance {
  accountIndex: number;
  mint: string;
  owner: string;
  uiTokenAmount: {
    amount: string;
    decimals: number;
  };
}

/**
 * Raw transaction data from chain fetcher.
 */
export type RawTransaction = EvmTransactionData | SvmTransactionData;

/**
 * Normalized transaction for upserting.
 */
export interface NormalizedTransaction {
  chainAlias: ChainAlias;
  txHash: string;
  blockNumber: string;
  blockHash: string;
  timestamp: Date;
  from: string;
  to: string | null;
  value: string;
  fee: string;
  status: 'success' | 'failed' | 'pending';
}

/**
 * Result of processing a transaction.
 */
export interface ProcessResult {
  transactionId: string;
  classificationType: ClassificationType;
  tokensDiscovered: number;
  tokensUpserted: number;
}

/**
 * Interface for chain fetchers.
 */
export interface ChainFetcher {
  fetch(chainAlias: ChainAlias, txHash: string): Promise<RawTransaction>;
}

/**
 * Interface for classifiers.
 */
export interface Classifier {
  classify(tx: RawTransaction, options: ClassifyOptions): Promise<ClassificationResult>;
}

/**
 * Options for upserting a transaction.
 */
export interface UpsertOptions {
  /** Address that triggered this upsert (for address_transactions linking) */
  forAddress?: string;
}

/**
 * Interface for the transaction upserter.
 */
export interface TransactionUpserter {
  upsert(
    normalized: NormalizedTransaction,
    classification: ClassificationResult,
    tokens: TokenInfo[],
    options?: UpsertOptions
  ): Promise<ProcessResult>;
}
