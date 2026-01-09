import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { Address, AddressToken, SpamClassification, Token as TokenRow } from '@/src/lib/database/types.js';

// ==================== Cursor-Based Pagination ====================

/**
 * Cursor-based pagination options as per requirements.
 * @see docs/requirements/common/001-cursor-pagination.md
 */
export interface CursorPaginationOptions {
  cursor?: string;
  limit: number;
}

/**
 * Cursor-based pagination result.
 * @see docs/requirements/common/001-cursor-pagination.md
 */
export interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

/**
 * Options for finding addresses by vault with cursor pagination.
 */
export interface FindByVaultCursorOptions extends CursorPaginationOptions {
  monitored?: boolean;
}

// ==================== Legacy Offset-Based Pagination ====================

/**
 * @deprecated Use CursorPaginationOptions instead
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * @deprecated Use FindByVaultCursorOptions instead
 */
export interface FindByVaultOptions extends PaginationOptions {
  monitored?: boolean;
}

/**
 * @deprecated Use CursorPaginatedResult instead
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

export interface CreateAddressInput {
  address: string;
  chainAlias: ChainAlias;
  vaultId: string;
  organisationId: string;
  ecosystem: string;
  workspaceId: string;
  derivationPath?: string;
  alias?: string;
}

export interface CreateTokenInput {
  contractAddress: string;
  symbol?: string;
  decimals?: number;
  name?: string;
}

export interface AddressRepository {
  // Core CRUD
  create(input: CreateAddressInput): Promise<Address>;
  findById(id: string): Promise<Address | null>;
  findByAddressAndChainAlias(address: string, chainAlias: ChainAlias): Promise<Address | null>;

  // Cursor-based pagination queries (preferred)
  findByVaultIdCursor(
    vaultId: string,
    options: FindByVaultCursorOptions
  ): Promise<CursorPaginatedResult<Address>>;
  findByVaultIdAndChainAliasCursor(
    vaultId: string,
    chainAlias: ChainAlias,
    options: FindByVaultCursorOptions
  ): Promise<CursorPaginatedResult<Address>>;
  findHDAddressesByVaultIdAndChainAliasCursor(
    vaultId: string,
    chainAlias: ChainAlias,
    options: CursorPaginationOptions
  ): Promise<CursorPaginatedResult<Address>>;

  // Legacy offset-based queries (deprecated)
  /** @deprecated Use findByVaultIdCursor instead */
  findByVaultId(vaultId: string, options?: FindByVaultOptions): Promise<PaginatedResult<Address>>;
  /** @deprecated Use findByVaultIdAndChainAliasCursor instead */
  findByVaultIdAndChainAlias(
    vaultId: string,
    chainAlias: ChainAlias,
    options?: FindByVaultOptions
  ): Promise<PaginatedResult<Address>>;
  findBySubscriptionId(subscriptionId: string): Promise<Address[]>;
  findMonitoredByVaultId(vaultId: string): Promise<Address[]>;
  findByOrganisationId(
    organisationId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Address>>;

  // Monitoring state
  setMonitored(id: string, subscriptionId: string): Promise<Address>;
  setUnmonitored(id: string): Promise<Address>;

  // Address updates
  updateAlias(id: string, alias: string | null): Promise<Address>;

  // Token management
  addToken(addressId: string, token: CreateTokenInput): Promise<AddressToken>;
  removeToken(addressId: string, contractAddress: string): Promise<void>;
  findTokensByAddressId(addressId: string): Promise<AddressToken[]>;
  setTokenHidden(addressId: string, contractAddress: string, hidden: boolean): Promise<void>;
  setTokensHidden(addressId: string, contractAddresses: string[], hidden: boolean): Promise<void>;
  upsertTokens(addressId: string, tokens: CreateTokenInput[]): Promise<AddressToken[]>;

  // Bulk operations
  createMany(inputs: CreateAddressInput[]): Promise<Address[]>;
  deleteByVaultId(vaultId: string): Promise<number>;

  // Block tracking
  findAllMonitored(): Promise<Address[]>;
  updateLastReconciledBlock(id: string, block: number): Promise<Address>;
}

// Token metadata types (for tokens table - global token registry)
export interface Token {
  id: string;
  chainAlias: ChainAlias;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUri: string | null;
  coingeckoId: string | null;
  isVerified: boolean;
  isSpam: boolean;
  // Classification worker fields
  spamClassification: SpamClassification | null;
  classificationUpdatedAt: Date | null;
  classificationTtlHours: number;
  needsClassification: boolean;
  classificationAttempts: number;
  classificationError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTokenMetadataInput {
  chainAlias: ChainAlias;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUri?: string | null;
  coingeckoId?: string | null;
  isVerified?: boolean;
  isSpam?: boolean;
}

export interface TokenRepository {
  findById(id: string): Promise<Token | null>;
  findByChainAliasAndAddress(chainAlias: ChainAlias, address: string): Promise<Token | null>;
  findVerifiedByChainAlias(chainAlias: ChainAlias): Promise<Token[]>;
  findByCoingeckoIds(coingeckoIds: string[]): Promise<Token[]>;
  upsert(input: CreateTokenMetadataInput): Promise<Token>;
  upsertMany(inputs: CreateTokenMetadataInput[]): Promise<Token[]>;

  // Classification worker methods
  findNeedingClassification(options: {
    limit: number;
    maxAttempts: number;
  }): Promise<Token[]>;

  /**
   * Marks tokens for re-classification when their cached classification has expired.
   * Uses the per-token `classification_ttl_hours` column to determine expiration.
   *
   * @param _ttlHours - Unused. TTL is determined by each token's classification_ttl_hours column.
   *                    Parameter kept for interface consistency.
   * @returns Number of tokens marked for re-classification
   */
  refreshExpiredClassifications(_ttlHours: number): Promise<number>;

  updateClassificationSuccess(
    tokenId: string,
    classification: SpamClassification
  ): Promise<void>;

  updateClassificationFailure(
    tokenId: string,
    errorMessage: string
  ): Promise<void>;
}

// Token price types (for token_prices table - CoinGecko price cache)
export interface TokenPrice {
  id: string;
  coingeckoId: string;
  currency: string;
  price: string;
  priceChange24h: string | null;
  marketCap: string | null;
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTokenPriceInput {
  coingeckoId: string;
  currency: string;
  price: string;
  priceChange24h?: string | null;
  marketCap?: string | null;
}

export interface TokenPriceRepository {
  findByCoingeckoId(coingeckoId: string, currency: string): Promise<TokenPrice | null>;
  findByCoingeckoIds(coingeckoIds: string[], currency: string): Promise<TokenPrice[]>;
  findFreshPrices(coingeckoIds: string[], currency: string, maxAgeSeconds: number): Promise<TokenPrice[]>;
  upsertMany(inputs: CreateTokenPriceInput[]): Promise<void>;
}

// Re-export database Token type for internal use
export type { TokenRow };

// Re-export database TokenPrice type for internal use
export type { TokenPrice as TokenPriceRow } from '@/src/lib/database/types.js';

// Transaction types (for transactions table)
export interface Transaction {
  id: string;
  chainAlias: ChainAlias;
  txHash: string;
  blockNumber: string;
  blockHash: string;
  txIndex: number | null;
  fromAddress: string;
  toAddress: string | null;
  value: string;
  fee: string | null;
  status: 'success' | 'failed' | 'pending';
  timestamp: Date;
  classificationType: string | null;
  classificationLabel: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Direction from the queried address's perspective (only populated when querying by address) */
  direction?: 'in' | 'out' | 'neutral';
}

// Transaction list pagination options (cursor-based)
export interface TransactionListOptions {
  cursor?: { timestamp: Date; txId: string };
  limit: number;
  sort: 'asc' | 'desc';
  /** Filter by direction(s) from the address's perspective */
  direction?: ('in' | 'out' | 'neutral')[];
}

// Transaction list result with cursor pagination
export interface TransactionListResult {
  data: Transaction[];
  hasMore: boolean;
}

// Native transfer types (for native_transfers table)
export interface NativeTransfer {
  id: string;
  txId: string;
  chainAlias: ChainAlias;
  fromAddress: string | null;
  toAddress: string | null;
  amount: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// Token transfer types (for token_transfers table)
export interface TokenTransfer {
  id: string;
  txId: string;
  chainAlias: ChainAlias;
  tokenAddress: string;
  fromAddress: string | null;
  toAddress: string | null;
  amount: string;
  transferType: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// Asset metadata for enriched transfers
export interface AssetMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logoUri: string | null;
  coingeckoId: string | null;
  isVerified: boolean;
  isSpam: boolean;
}

// Unified enriched transfer (combines native and token transfers)
export interface EnrichedTransfer {
  id: string;
  transferType: 'native' | 'token';
  direction: 'in' | 'out';
  fromAddress: string | null;
  toAddress: string | null;
  tokenAddress: string | null;
  amount: string;
  formattedAmount: string;
  displayAmount: string;
  asset: AssetMetadata;
}

export interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByTxHash(chainAlias: ChainAlias, txHash: string): Promise<Transaction | null>;
  findByAddress(
    address: string,
    options?: { chainAlias?: ChainAlias; limit?: number; offset?: number }
  ): Promise<{ data: Transaction[]; total: number }>;

  // Cursor-based pagination for transaction listing
  findByChainAliasAndAddress(
    chainAlias: ChainAlias,
    address: string,
    options: TransactionListOptions
  ): Promise<TransactionListResult>;

  // Batch fetching for transfers
  findNativeTransfersByTxIds(txIds: string[]): Promise<NativeTransfer[]>;
  findTokenTransfersByTxIds(txIds: string[]): Promise<TokenTransfer[]>;

  // Batch fetching for transfers with joined token metadata
  findTokenTransfersWithMetadataByTxIds(txIds: string[]): Promise<TokenTransferWithMetadata[]>;
}

// Token transfer with joined metadata from tokens table
export interface TokenTransferWithMetadata extends TokenTransfer {
  tokenName: string | null;
  tokenSymbol: string | null;
  tokenDecimals: number | null;
  tokenLogoUri: string | null;
  tokenCoingeckoId: string | null;
  tokenIsVerified: boolean | null;
  tokenIsSpam: boolean | null;
}

// Token holding types (for token_holdings table - per-address balance tracking)
export interface TokenHolding {
  id: string;
  addressId: string;
  chainAlias: ChainAlias;
  tokenAddress: string | null;
  isNative: boolean;
  balance: string;
  decimals: number;
  name: string;
  symbol: string;
  visibility: 'visible' | 'hidden';
  userSpamOverride: 'trusted' | 'spam' | null;
  overrideUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTokenHoldingInput {
  addressId: string;
  chainAlias: ChainAlias;
  tokenAddress: string | null;
  isNative: boolean;
  balance: string;
  decimals: number;
  name: string;
  symbol: string;
}

export interface TokenHoldingRepository {
  findByAddressId(addressId: string): Promise<TokenHolding[]>;
  findVisibleByAddressId(addressId: string): Promise<TokenHolding[]>;
  upsert(input: CreateTokenHoldingInput): Promise<TokenHolding>;
  /**
   * Performs a bulk upsert of token holdings (insert or update if exists).
   * Uses the unique constraint on (address_id, chain_alias, COALESCE(token_address, ''))
   * to determine conflicts.
   * @param inputs - Array of token holding records to upsert
   * @returns Array of upserted TokenHolding records
   */
  upsertMany(inputs: CreateTokenHoldingInput[]): Promise<TokenHolding[]>;
  updateVisibility(id: string, visibility: 'visible' | 'hidden'): Promise<TokenHolding>;
  updateSpamOverride(
    addressId: string,
    tokenAddress: string | null,
    override: 'trusted' | 'spam' | null
  ): Promise<TokenHolding | null>;
  /**
   * Updates spam overrides for multiple tokens in a single database transaction.
   * Ensures atomicity - all updates succeed or all fail together.
   */
  updateSpamOverrideBatch(
    addressId: string,
    overrides: Array<{ tokenAddress: string | null; override: 'trusted' | 'spam' | null }>
  ): Promise<TokenHolding[]>;
}

// Reconciliation job types
export interface ReconciliationJob {
  id: string;
  address: string;
  chainAlias: ChainAlias;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  provider: string;
  fromTimestamp: Date | null;
  toTimestamp: Date | null;
  lastProcessedCursor: string | null;
  processedCount: number;
  transactionsAdded: number;
  transactionsSoftDeleted: number;
  discrepanciesFlagged: number;
  errorsCount: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  mode: 'full' | 'partial';
  fromBlock: number | null;
  toBlock: number | null;
  finalBlock: number | null;
  // Noves job tracking fields
  novesJobId: string | null;
  novesNextPageUrl: string | null;
  novesJobStartedAt: Date | null;
}

export interface CreateReconciliationJobInput {
  address: string;
  chainAlias: ChainAlias;
  provider: string;
  fromTimestamp?: Date;
  toTimestamp?: Date;
  mode?: 'full' | 'partial';
  fromBlock?: number;
  toBlock?: number;
}

export interface UpdateReconciliationJobInput {
  status?: ReconciliationJob['status'];
  lastProcessedCursor?: string | null;
  processedCount?: number;
  transactionsAdded?: number;
  transactionsSoftDeleted?: number;
  discrepanciesFlagged?: number;
  errorsCount?: number;
  startedAt?: Date;
  completedAt?: Date;
  mode?: 'full' | 'partial';
  fromBlock?: number | null;
  toBlock?: number | null;
  finalBlock?: number | null;
  // Noves job tracking fields
  novesJobId?: string | null;
  novesNextPageUrl?: string | null;
  novesJobStartedAt?: Date | null;
}

export interface ReconciliationAuditEntry {
  id: string;
  jobId: string;
  transactionHash: string;
  action: 'added' | 'soft_deleted' | 'discrepancy' | 'error';
  beforeSnapshot: Record<string, unknown> | null;
  afterSnapshot: Record<string, unknown> | null;
  discrepancyFields: string[] | null;
  errorMessage: string | null;
  createdAt: Date;
}

export interface CreateAuditEntryInput {
  jobId: string;
  transactionHash: string;
  action: ReconciliationAuditEntry['action'];
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
  discrepancyFields?: string[] | null;
  errorMessage?: string | null;
}

export interface ReconciliationJobRepository {
  create(input: CreateReconciliationJobInput): Promise<ReconciliationJob>;
  findById(id: string): Promise<ReconciliationJob | null>;
  findByAddressAndChainAlias(
    address: string,
    chainAlias: ChainAlias,
    options?: { limit?: number; offset?: number }
  ): Promise<{ data: ReconciliationJob[]; total: number }>;
  update(id: string, input: UpdateReconciliationJobInput): Promise<ReconciliationJob>;
  claimNextPendingJob(): Promise<ReconciliationJob | null>;
  /**
   * Finds an active (pending or running) job for a specific address and chainAlias.
   * Used to enforce one-job-per-address-chain policy.
   * @param address - The wallet address
   * @param chainAlias - The blockchain chain alias identifier
   * @returns The active job if one exists, null otherwise
   */
  findActiveJobByAddressAndChainAlias(address: string, chainAlias: ChainAlias): Promise<ReconciliationJob | null>;
  /**
   * Deletes a job by ID. Only pending jobs should be deleted.
   * @param id - The job ID to delete
   * @returns true if deleted, false if not found
   */
  deleteJob(id: string): Promise<boolean>;
  /**
   * Finds and resets jobs that have been stuck in 'running' status for too long.
   * This handles sync jobs that crashed mid-processing without cleanup.
   * @param staleThresholdMs - Jobs running longer than this are considered stale (default: 1 hour)
   * @returns Number of jobs reset to 'pending' status
   */
  resetStaleRunningJobs(staleThresholdMs?: number): Promise<number>;
  addAuditEntry(input: CreateAuditEntryInput): Promise<ReconciliationAuditEntry>;
  getAuditLog(jobId: string): Promise<ReconciliationAuditEntry[]>;
}
