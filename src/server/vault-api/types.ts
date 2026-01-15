/**
 * Re-exports and type helpers for the Vault API.
 */

// Re-export generated types
export type { paths, operations } from '@/lib/api/vault-api';

// Type helpers for extracting response/request types from operations
import type { operations } from '@/lib/api/vault-api';

// Helper types for extracting request/response shapes
type SuccessResponse<T extends keyof operations> = operations[T] extends {
  responses: { 200: { content: { 'application/json': infer R } } };
}
  ? R
  : operations[T] extends {
        responses: { 201: { content: { 'application/json': infer R } } };
      }
    ? R
    : never;

type RequestBody<T extends keyof operations> = operations[T] extends {
  requestBody: { content: { 'application/json': infer R } };
}
  ? R
  : never;

type QueryParams<T extends keyof operations> = operations[T] extends {
  parameters: { query?: infer Q };
}
  ? Q
  : never;

// Vault types
export type Vault = SuccessResponse<'vaults.get'>;
export type VaultListResponse = SuccessResponse<'vaults.list'>;
export type VaultListParams = QueryParams<'vaults.list'>;
export type CreateVaultInput = RequestBody<'vaults.create'>;

// Signer types
export type SignerListResponse = SuccessResponse<'signers.list'>;
export type SignerListParams = QueryParams<'signers.list'>;
export type RegisterSignerInput = RequestBody<'signers.register'>;
export type RegisterSignerResponse = SuccessResponse<'signers.register'>;
// Extract single Signer type from list response
export type Signer = SignerListResponse['data'][number];

// Reshare types
export type Reshare = SuccessResponse<'reshares.get'>;
export type ReshareListResponse = SuccessResponse<'reshares.list'>;
export type ReshareListParams = QueryParams<'reshares.list'>;
export type CreateReshareInput = RequestBody<'reshares.create'>;
export type ReshareVotesResponse = SuccessResponse<'reshares.getVotes'>;

// Signature types
export type Signature = SuccessResponse<'signatures.get'>;
export type SignatureListResponse = SuccessResponse<'signatures.list'>;
export type SignatureListParams = QueryParams<'signatures.list'>;
export type CreateSignatureInput = RequestBody<'signatures.create'>;
export type SignatureVotesResponse = SuccessResponse<'signatures.getVotes'>;
