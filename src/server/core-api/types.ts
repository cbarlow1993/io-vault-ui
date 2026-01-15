/**
 * Re-exports and type helpers for the Core API.
 */

// Re-export generated types
export type { paths } from '@/lib/api/core-api';

import type { paths } from '@/lib/api/core-api';

// Helper types for extracting request/response shapes from paths
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

type PathResponse<
  P extends keyof paths,
  M extends HttpMethod,
> = paths[P] extends {
  [K in M]: {
    responses: { 200: { content: { 'application/json': infer R } } };
  };
}
  ? R
  : paths[P] extends {
        [K in M]: {
          responses: { 201: { content: { 'application/json': infer R } } };
        };
      }
    ? R
    : never;

type PathRequestBody<
  P extends keyof paths,
  M extends HttpMethod,
> = paths[P] extends {
  [K in M]: { requestBody: { content: { 'application/json': infer R } } };
}
  ? R
  : never;

type PathQueryParams<
  P extends keyof paths,
  M extends HttpMethod,
> = paths[P] extends { [K in M]: { parameters: { query?: infer Q } } }
  ? Q
  : never;

// Chain types
export type ChainListParams = PathQueryParams<'/v2/chains/', 'get'>;

// Module types
export type ModuleListResponse = PathResponse<'/v2/modules/', 'get'>;
export type Module = ModuleListResponse['modules'][number];
export type ModuleRolesResponse = PathResponse<
  '/v2/modules/{moduleId}/roles',
  'get'
>;
export type ModuleRole = ModuleRolesResponse['roles'][number];
export type ModuleActionsResponse = PathResponse<
  '/v2/modules/{moduleId}/actions',
  'get'
>;
export type ModuleAction = ModuleActionsResponse['actions'][number];

// Address types
export type AddressListResponse = PathResponse<
  '/v2/vaults/{vaultId}/addresses/',
  'get'
>;
export type AddressListParams = PathQueryParams<
  '/v2/vaults/{vaultId}/addresses/',
  'get'
>;
export type Address = AddressListResponse['data'][number];
export type AddressByChainListResponse = PathResponse<
  '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}',
  'get'
>;
export type AddressByChainListParams = PathQueryParams<
  '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}',
  'get'
>;
export type CreateAddressInput = PathRequestBody<
  '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}',
  'post'
>;
export type AddressResponse = PathResponse<
  '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}/address/{address}',
  'get'
>;
export type UpdateAddressInput = PathRequestBody<
  '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}/address/{address}',
  'patch'
>;
export type GenerateAddressInput = PathRequestBody<
  '/v2/vaults/{vaultId}/addresses/',
  'post'
>;
export type GenerateAddressResponse = PathResponse<
  '/v2/vaults/{vaultId}/addresses/',
  'post'
>;

// HD Address types
export type CreateHdAddressInput = PathRequestBody<
  '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}/hd-addresses',
  'post'
>;
export type HdAddressResponse = PathResponse<
  '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}/hd-addresses',
  'post'
>;
export type HdAddressListResponse = PathResponse<
  '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}/hd-addresses',
  'get'
>;
export type HdAddressListParams = PathQueryParams<
  '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}/hd-addresses',
  'get'
>;

// Balance types
export type NativeBalanceResponse = PathResponse<
  '/v2/balances/ecosystem/{ecosystem}/chain/{chainAlias}/address/{address}/native',
  'get'
>;
export type TokenBalancesResponse = PathResponse<
  '/v2/balances/ecosystem/{ecosystem}/chain/{chainAlias}/address/{address}/tokens',
  'get'
>;

// Transaction types
export type TransactionListResponse = PathResponse<
  '/v2/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/address/{address}',
  'get'
>;
export type TransactionListParams = PathQueryParams<
  '/v2/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/address/{address}',
  'get'
>;
export type TransactionResponse = PathResponse<
  '/v2/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/address/{address}/transaction/{transactionHash}',
  'get'
>;
export type ScanTransactionInput = PathRequestBody<
  '/v2/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/scan-transaction',
  'post'
>;
export type ScanTransactionResponse = PathResponse<
  '/v2/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/scan-transaction',
  'post'
>;
export type BuildNativeTransactionInput = PathRequestBody<
  '/v2/vaults/{vaultId}/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/build-native-transaction',
  'post'
>;
export type BuildNativeTransactionResponse = PathResponse<
  '/v2/vaults/{vaultId}/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/build-native-transaction',
  'post'
>;
export type BuildTokenTransactionInput = PathRequestBody<
  '/v2/vaults/{vaultId}/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/build-token-transaction',
  'post'
>;
export type BuildTokenTransactionResponse = PathResponse<
  '/v2/vaults/{vaultId}/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/build-token-transaction',
  'post'
>;
export type SubmitTransactionInput = PathRequestBody<
  '/v2/vaults/{vaultId}/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/transaction',
  'post'
>;
export type SubmitTransactionResponse = PathResponse<
  '/v2/vaults/{vaultId}/transactions/ecosystem/{ecosystem}/chain/{chainAlias}/transaction',
  'post'
>;

// Solana durable nonce types
export type DurableNonceResponse = PathResponse<
  '/v2/vaults/{vaultId}/transactions/ecosystem/svm/chain/solana/durable-nonce',
  'get'
>;
export type BuildDurableNonceTransactionInput = PathRequestBody<
  '/v2/vaults/{vaultId}/transactions/ecosystem/svm/chain/solana/build-durable-nonce-transaction',
  'post'
>;
export type BuildDurableNonceTransactionResponse = PathResponse<
  '/v2/vaults/{vaultId}/transactions/ecosystem/svm/chain/solana/build-durable-nonce-transaction',
  'post'
>;

// Workflow types
export type WorkflowResponse = PathResponse<'/v2/workflows/{id}', 'get'>;
export type Workflow = WorkflowResponse;
export type WorkflowApproveInput = PathRequestBody<
  '/v2/workflows/{id}/approve',
  'post'
>;
export type WorkflowRejectInput = PathRequestBody<
  '/v2/workflows/{id}/reject',
  'post'
>;
export type WorkflowConfirmInput = PathRequestBody<
  '/v2/workflows/{id}/confirm',
  'post'
>;

// Organisation/User role types
export type UserRolesResponse = PathResponse<
  '/v2/organisations/{orgId}/users/{userId}/roles',
  'get'
>;

// Reconciliation types
export type ReconcileResponse = PathResponse<
  '/v2/reconciliation/addresses/{address}/chain/{chainAlias}/reconcile',
  'post'
>;
export type ReconciliationJobsResponse = PathResponse<
  '/v2/reconciliation/addresses/{address}/chain/{chainAlias}/reconciliation-jobs',
  'get'
>;
export type ReconciliationJobResponse = PathResponse<
  '/v2/reconciliation/reconciliation-jobs/{jobId}',
  'get'
>;

// Address validation types
export type ValidateAddressInput = PathRequestBody<
  '/v2/addresses/ecosystem/{ecosystem}/chain/{chainAlias}/validate',
  'post'
>;
export type ValidateAddressResponse = PathResponse<
  '/v2/addresses/ecosystem/{ecosystem}/chain/{chainAlias}/validate',
  'post'
>;

// Ecosystem and chain alias types (for convenience)
export type Ecosystem =
  | 'cosmos'
  | 'evm'
  | 'svm'
  | 'tvm'
  | 'utxo'
  | 'xrp'
  | 'substrate';
export type ChainAlias =
  | 'arbitrum'
  | 'avalanche-c'
  | 'base'
  | 'bsc'
  | 'eth'
  | 'eth-sepolia'
  | 'fantom'
  | 'optimism'
  | 'polygon'
  | 'bitcoin'
  | 'solana'
  | 'ripple'
  | 'tron';
