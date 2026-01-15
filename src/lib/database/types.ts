import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

// Vault database schema (external vault database)
export interface VaultDatabase {
  Vault: VaultTable;
  VaultCurve: VaultCurveTable;
  Tag: TagTable;
  TagAssignment: TagAssignmentTable;
}

// Vault table
export interface VaultTable {
  id: string;
  workspaceId: string;
  organisationId: string;
  createdAt: Date;
}

// Elliptic curve enum values
export type ElipticCurve = 'secp256k1' | 'ed25519';

// VaultCurve table
export interface VaultCurveTable {
  id: Generated<string>;
  vaultId: string;
  curve: ElipticCurve;
  xpub: string;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

// Tag table
export interface TagTable {
  id: string;
  name: string;
  organisationId: string;
  workspaceId: string;
}

// TagAssignment table
export interface TagAssignmentTable {
  id: Generated<string>;
  tagId: string;
  value: string;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

// Vault database type helpers
export type VaultRow = Selectable<VaultTable>;
export type VaultCurveRow = Selectable<VaultCurveTable>;
export type InsertableVault = Insertable<VaultTable>;
export type InsertableVaultCurve = Insertable<VaultCurveTable>;
export type TagRow = Selectable<TagTable>;
export type TagAssignmentRow = Selectable<TagAssignmentTable>;

// RBAC Module tables
export interface ModuleTable {
  id: Generated<string>;
  name: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
  created_at: Generated<Date>;
}

export interface ModuleActionTable {
  id: Generated<string>;
  module_id: string;
  name: string;
  display_name: string;
  description: string | null;
  created_at: Generated<Date>;
}

export interface ModuleRoleTable {
  id: Generated<string>;
  module_id: string;
  name: string;
  display_name: string;
  description: string | null;
  created_at: Generated<Date>;
}

export interface ModuleRolePermissionTable {
  id: Generated<string>;
  module_role_id: string;
  action_id: string;
  created_at: Generated<Date>;
}

export type GlobalRole = 'owner' | 'billing' | 'admin';

export interface UserGlobalRoleTable {
  id: Generated<string>;
  user_id: string;
  organisation_id: string;
  role: GlobalRole;
  created_at: Generated<Date>;
  granted_by: string | null;
}

export interface ResourceScope {
  vault_ids?: string[];
}

export interface UserModuleRoleTable {
  id: Generated<string>;
  user_id: string;
  organisation_id: string;
  module_id: string;
  module_role_id: string;
  resource_scope: ColumnType<ResourceScope | null, string | null, string | null>;
  created_at: Generated<Date>;
  granted_by: string;
}

export interface PolicyDecisionTable {
  id: Generated<string>;
  organisation_id: string;
  user_id: string;
  module: string;
  action: string;
  resource: ColumnType<Record<string, unknown> | null, string | null, string | null>;
  decision: 'allow' | 'deny';
  reason: string | null;
  matched_role: string | null;
  request_id: string | null;
  endpoint: string | null;
  evaluation_time_ms: number | null;
  created_at: Generated<Date>;
}

export interface Database {
  addresses: AddressTable;
  address_tokens: AddressTokenTable;
  tokens: TokenTable;
  token_prices: TokenPriceTable;
  transactions: TransactionTable;
  native_transfers: NativeTransferTable;
  token_transfers: TokenTransferTable;
  token_holdings: TokenHoldingTable;
  address_transactions: AddressTransactionTable;
  sync_state: SyncStateTable;
  reconciliation_jobs: ReconciliationJobTable;
  reconciliation_audit_log: ReconciliationAuditLogTable;
  transaction_workflows: TransactionWorkflowTable;
  transaction_workflow_events: TransactionWorkflowEventTable;
  modules: ModuleTable;
  module_actions: ModuleActionTable;
  module_roles: ModuleRoleTable;
  module_role_permissions: ModuleRolePermissionTable;
  user_global_roles: UserGlobalRoleTable;
  user_module_roles: UserModuleRoleTable;
  policy_decisions: PolicyDecisionTable;
}

export interface AddressTable {
  id: Generated<string>;
  address: string;
  chain_alias: string;
  vault_id: string;
  organisation_id: string;
  ecosystem: string;
  workspace_id: string;
  derivation_path: string | null;
  alias: string | null;
  is_monitored: boolean;
  subscription_id: string | null;
  monitored_at: Date | null;
  unmonitored_at: Date | null;
  last_reconciled_block: number | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface AddressTokenTable {
  id: Generated<string>;
  address_id: string;
  contract_address: string;
  symbol: string | null;
  decimals: number | null;
  name: string | null;
  hidden: boolean;
  created_at: Generated<Date>;
}

// Spam classification data from multiple sources
export interface SpamClassification {
  blockaid: {
    isMalicious: boolean;
    isPhishing: boolean;
    riskScore: number | null;
    attackTypes: string[];
    checkedAt: string;
  } | null;
  coingecko: {
    isListed: boolean;
    marketCapRank: number | null;
  };
  heuristics: {
    suspiciousName: boolean;
    namePatterns: string[];
    isUnsolicited: boolean;
    contractAgeDays: number | null;
    isNewContract: boolean;
    holderDistribution: 'normal' | 'suspicious' | 'unknown';
  };
}

// Token metadata table
export interface TokenTable {
  id: string;
  chain_alias: string;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo_uri: string | null;
  coingecko_id: string | null;
  is_verified: boolean;
  is_spam: boolean;
  spam_classification: ColumnType<SpamClassification | null, string | null, string | null>;
  classification_updated_at: ColumnType<Date | null, string | null, string | null>;
  classification_ttl_hours: number | null;
  needs_classification: boolean;
  classification_attempts: number;
  classification_error: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

// Token prices cache table
export interface TokenPriceTable {
  id: string;
  coingecko_id: string;
  currency: string;
  price: string;
  price_change_24h: string | null;
  market_cap: string | null;
  fetched_at: ColumnType<Date, string, string>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

// Transaction table
export interface TransactionTable {
  id: string;
  chain_alias: string;
  tx_hash: string;
  block_number: string;
  block_hash: string;
  tx_index: number | null;
  from_address: string;
  to_address: string | null;
  value: string;
  fee: string | null;
  status: 'success' | 'failed' | 'pending';
  timestamp: ColumnType<Date, string, never>;
  classification_type: string | null;
  classification_label: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
  // Soft-delete columns for reconciliation
  deleted_at: Date | null;
  deletion_reason: string | null;
}

// Native transfer table
export interface NativeTransferTable {
  id: string;
  tx_id: string;
  chain_alias: string;
  from_address: string | null;
  to_address: string | null;
  amount: string;
  metadata: ColumnType<Record<string, unknown> | null, string | null, string | null>;
  created_at: ColumnType<Date, string | undefined, never>;
}

// Token transfer table
export interface TokenTransferTable {
  id: string;
  tx_id: string;
  chain_alias: string;
  token_address: string;
  from_address: string | null;
  to_address: string | null;
  amount: string;
  transfer_type: 'transfer' | 'mint' | 'burn' | 'approve';
  metadata: ColumnType<Record<string, unknown> | null, string | null, string | null>;
  created_at: ColumnType<Date, string | undefined, never>;
}

// Token holdings table (modified for native support)
export interface TokenHoldingTable {
  id: string;
  address_id: string;
  chain_alias: string;
  token_address: string | null; // null = native currency
  is_native: boolean;
  balance: string;
  decimals: number;
  name: string;
  symbol: string;
  visibility: 'visible' | 'hidden';
  user_spam_override: 'trusted' | 'spam' | null;
  override_updated_at: Date | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

// Address transactions (denormalized)
export interface AddressTransactionTable {
  id: string;
  address: string;
  tx_id: string;
  chain_alias: string;
  timestamp: ColumnType<Date, string, never>;
  has_native_transfer: boolean;
  has_token_transfer: boolean;
  total_value: string | null;
  direction: 'in' | 'out' | 'neutral';
  created_at: ColumnType<Date, string | undefined, never>;
}

// Sync state table
export interface SyncStateTable {
  id: string;
  address_id: string;
  chain_alias: string;
  last_indexed_block: string;
  last_indexed_tx_hash: string | null;
  last_indexed_at: ColumnType<Date, string, string>;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  error_message: string | null;
  retry_count: number;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

// Type helpers
export type Address = Selectable<AddressTable>;
export type NewAddress = Insertable<AddressTable>;
export type AddressUpdate = Updateable<AddressTable>;

export type AddressToken = Selectable<AddressTokenTable>;
export type NewAddressToken = Insertable<AddressTokenTable>;

export type Token = Selectable<TokenTable>;
export type NewToken = Insertable<TokenTable>;
export type TokenUpdate = Updateable<TokenTable>;

export type TokenPrice = Selectable<TokenPriceTable>;
export type NewTokenPrice = Insertable<TokenPriceTable>;
export type TokenPriceUpdate = Updateable<TokenPriceTable>;

export type Transaction = Selectable<TransactionTable>;
export type NewTransaction = Insertable<TransactionTable>;
export type TransactionUpdate = Updateable<TransactionTable>;

export type NativeTransfer = Selectable<NativeTransferTable>;
export type NewNativeTransfer = Insertable<NativeTransferTable>;

export type TokenTransfer = Selectable<TokenTransferTable>;
export type NewTokenTransfer = Insertable<TokenTransferTable>;

export type TokenHolding = Selectable<TokenHoldingTable>;
export type NewTokenHolding = Insertable<TokenHoldingTable>;
export type TokenHoldingUpdate = Updateable<TokenHoldingTable>;

export type AddressTransaction = Selectable<AddressTransactionTable>;
export type NewAddressTransaction = Insertable<AddressTransactionTable>;

export type SyncState = Selectable<SyncStateTable>;
export type NewSyncState = Insertable<SyncStateTable>;
export type SyncStateUpdate = Updateable<SyncStateTable>;

// Reconciliation job table
export interface ReconciliationJobTable {
  id: Generated<string>;
  address: string;
  chain_alias: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  provider: string;
  from_timestamp: Date | null;
  to_timestamp: Date | null;
  last_processed_cursor: string | null;
  processed_count: number;
  transactions_added: number;
  transactions_soft_deleted: number;
  discrepancies_flagged: number;
  errors_count: number;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  started_at: Date | null;
  completed_at: Date | null;
  mode: 'full' | 'partial';
  // Block numbers are stored as PostgreSQL bigint but typed as number in TypeScript.
  // This is acceptable because block numbers on all supported chains (Ethereum, etc.)
  // are well within JavaScript's safe integer range (2^53 - 1 = ~9 quadrillion).
  // Current Ethereum block is ~19M; even at 1 block/second for 100 years = ~3.15B blocks.
  from_block: number | null;
  to_block: number | null;
  final_block: number | null;
  // Noves async job tracking columns
  noves_job_id: string | null;
  noves_next_page_url: string | null;
  noves_job_started_at: Date | null;
}

// Reconciliation audit log table
export interface ReconciliationAuditLogTable {
  id: Generated<string>;
  job_id: string;
  transaction_hash: string;
  action: 'added' | 'soft_deleted' | 'discrepancy' | 'error';
  before_snapshot: ColumnType<Record<string, unknown> | null, string | null, string | null>;
  after_snapshot: ColumnType<Record<string, unknown> | null, string | null, string | null>;
  discrepancy_fields: string[] | null;
  error_message: string | null;
  created_at: Generated<Date>;
}

// Reconciliation type helpers
export type ReconciliationJob = Selectable<ReconciliationJobTable>;
export type NewReconciliationJob = Insertable<ReconciliationJobTable>;
export type ReconciliationJobUpdate = Updateable<ReconciliationJobTable>;

export type ReconciliationAuditLog = Selectable<ReconciliationAuditLogTable>;
export type NewReconciliationAuditLog = Insertable<ReconciliationAuditLogTable>;

// Transaction workflow table
export interface TransactionWorkflowTable {
  id: Generated<string>;
  state: string;
  context: Record<string, unknown>;
  vault_id: string;
  chain_alias: string;
  marshalled_hex: string;
  organisation_id: string;
  created_by: Record<string, unknown>;
  tx_hash: string | null;
  signature: string | null;
  block_number: number | null;
  version: Generated<number>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  completed_at: Date | null;
}

// Transaction workflow event table
export interface TransactionWorkflowEventTable {
  id: Generated<string>;
  workflow_id: string;
  event_type: string;
  event_payload: Record<string, unknown>;
  from_state: string;
  to_state: string;
  context_snapshot: Record<string, unknown>;
  triggered_by: string | null;
  created_at: Generated<Date>;
}

// Transaction workflow type helpers
export type TransactionWorkflow = Selectable<TransactionWorkflowTable>;
export type NewTransactionWorkflow = Insertable<TransactionWorkflowTable>;
export type TransactionWorkflowUpdate = Updateable<TransactionWorkflowTable>;

export type TransactionWorkflowEvent = Selectable<TransactionWorkflowEventTable>;
export type NewTransactionWorkflowEvent = Insertable<TransactionWorkflowEventTable>;

// RBAC type helpers
export type Module = Selectable<ModuleTable>;
export type NewModule = Insertable<ModuleTable>;
export type ModuleAction = Selectable<ModuleActionTable>;
export type NewModuleAction = Insertable<ModuleActionTable>;
export type ModuleRole = Selectable<ModuleRoleTable>;
export type NewModuleRole = Insertable<ModuleRoleTable>;
export type ModuleRolePermission = Selectable<ModuleRolePermissionTable>;
export type NewModuleRolePermission = Insertable<ModuleRolePermissionTable>;
export type UserGlobalRole = Selectable<UserGlobalRoleTable>;
export type NewUserGlobalRole = Insertable<UserGlobalRoleTable>;
export type UserModuleRole = Selectable<UserModuleRoleTable>;
export type NewUserModuleRole = Insertable<UserModuleRoleTable>;
export type PolicyDecision = Selectable<PolicyDecisionTable>;
export type NewPolicyDecision = Insertable<PolicyDecisionTable>;
