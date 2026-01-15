import { auth as clerkAuth } from '@clerk/tanstack-react-start/server';
import { ORPCError } from '@orpc/client';

import type { Vault, VaultCurve, VaultStatus } from '@/features/vaults/schema';
import {
  zCreateReshareInput,
  zCreateReshareResponse,
  zCreateVaultInput,
  zCreateVaultResponse,
  zGetReshareParams,
  zGetSignatureParams,
  zGetVaultParams,
  zReshare,
  zReshareListParams,
  zReshareListResponse,
  zReshareVotesResponse,
  zSignatureItem,
  zSignatureListParams,
  zSignatureListResponse,
  zVault,
  zVaultListParams,
  zVaultListResponse,
} from '@/features/vaults/schema';
import { protectedProcedure } from '@/server/orpc';
import {
  ReshareRepository,
  SignatureRepository,
  VaultRepository,
} from '@/server/vault-api/repositories';

const tags = ['vaults'];

// API status type
type ApiVaultStatus = 'draft' | 'active' | 'archived';

// API curve type from vault-api.d.ts
type ApiCurve = {
  id: string;
  curve: 'edwards' | 'nist256p1' | 'secp256k1';
  algorithm: 'eddsa' | 'ecdsa';
  xpub: string;
  createdAt: string;
};

// API vault type from vault-api.d.ts
type ApiVault = {
  id: string;
  name: string;
  description?: string | null;
  threshold: number;
  status: ApiVaultStatus;
  reshareNonce: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  curves?: ApiCurve[] | null;
};

// Status values are now the same between API and UI: draft | active | archived

/**
 * Map API curve name to UI-friendly name.
 */
function mapCurveName(apiCurve: 'edwards' | 'nist256p1' | 'secp256k1'): string {
  switch (apiCurve) {
    case 'edwards':
      return 'ed25519';
    case 'secp256k1':
      return 'secp256k1';
    case 'nist256p1':
      return 'secp256r1';
  }
}

/**
 * Generate a fingerprint from a public key.
 * Format: 0x[first4]...[last4]
 */
function generateFingerprint(publicKey: string): string {
  const clean = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
  if (clean.length < 8) return `0x${clean}`;
  return `0x${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

/**
 * Transform API curve to UI curve format.
 */
function mapApiCurveToUi(apiCurve: ApiCurve): VaultCurve {
  return {
    type: apiCurve.algorithm === 'eddsa' ? 'EdDSA' : 'ECDSA',
    curve: mapCurveName(apiCurve.curve),
    publicKey: apiCurve.xpub,
    fingerprint: generateFingerprint(apiCurve.xpub),
  };
}

/**
 * Transform API vault response to UI vault format.
 * TODO: Remove placeholder values when API returns full data.
 */
function mapApiVaultToUiVault(apiVault: ApiVault): Vault {
  return {
    id: apiVault.id,
    name: apiVault.name,
    curves: (apiVault.curves ?? []).map(mapApiCurveToUi),
    threshold: apiVault.threshold,
    signers: [], // Placeholder - API doesn't return signers in list
    status: apiVault.status,
    createdAt: apiVault.createdAt,
    createdBy: apiVault.createdBy,
    lastUsed: null, // Placeholder - not available in API
    signatureCount: 0, // Placeholder - requires separate API call
  };
}

/**
 * Filter vaults client-side by search term.
 */
function filterVaultsBySearch(vaults: Vault[], search?: string): Vault[] {
  if (!search) return vaults;

  const searchLower = search.toLowerCase();
  return vaults.filter((vault) => {
    const matchesName = vault.name.toLowerCase().includes(searchLower);
    const matchesCreatedBy = vault.createdBy
      .toLowerCase()
      .includes(searchLower);
    return matchesName || matchesCreatedBy;
  });
}

export default {
  list: protectedProcedure({ permission: null })
    .route({
      method: 'GET',
      path: '/vaults',
      tags,
    })
    .input(zVaultListParams.optional())
    .output(zVaultListResponse)
    .handler(async ({ context, input }) => {
      context.logger.info('Fetching vaults list');

      // Get auth token for vault API
      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      // Status values are now the same between API and UI
      const apiStatus = input?.status;

      const vaultRepo = new VaultRepository(token);
      const result = await vaultRepo.list({
        limit: input?.limit,
        cursor: input?.cursor,
        status: apiStatus,
      });

      // Transform API response to UI format with placeholder values
      const transformedVaults = (result.data as ApiVault[]).map(
        mapApiVaultToUiVault
      );

      // Apply client-side search filter
      const filteredVaults = filterVaultsBySearch(
        transformedVaults,
        input?.search
      );

      return {
        data: filteredVaults,
        nextCursor: result.nextCursor ?? null,
        hasMore: result.hasMore,
      };
    }),

  get: protectedProcedure({ permission: null })
    .route({
      method: 'GET',
      path: '/vaults/{id}',
      tags,
    })
    .input(zGetVaultParams)
    .output(zVault)
    .handler(async ({ context, input }) => {
      context.logger.info(`Fetching vault: ${input.id}`);

      // Get auth token for vault API
      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      const vaultRepo = new VaultRepository(token);
      const result = (await vaultRepo.get(input.id)) as ApiVault;

      return mapApiVaultToUiVault(result);
    }),

  create: protectedProcedure({ permission: null })
    .route({
      method: 'POST',
      path: '/vaults',
      tags,
    })
    .input(zCreateVaultInput)
    .output(zCreateVaultResponse)
    .handler(async ({ context, input }) => {
      context.logger.info(`Creating vault: ${input.name}`);

      // Get auth token for vault API
      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      const vaultRepo = new VaultRepository(token);
      return await vaultRepo.create({
        name: input.name,
        description: input.description ?? null,
        threshold: input.threshold,
        signers: input.signers,
      });
    }),

  createReshare: protectedProcedure({ permission: null })
    .route({
      method: 'POST',
      path: '/vaults/{vaultId}/reshares',
      tags,
    })
    .input(zCreateReshareInput)
    .output(zCreateReshareResponse)
    .handler(async ({ context, input }) => {
      context.logger.info(`Creating reshare for vault: ${input.vaultId}`);

      // Get auth token for vault API
      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      const reshareRepo = new ReshareRepository(token);
      const result = await reshareRepo.create(input.vaultId, {
        threshold: input.threshold,
        signers: input.signers,
        expiresAt: input.expiresAt ?? null,
        memo: input.memo ?? null,
      });

      return {
        id: result.id,
        vaultId: result.vaultId,
        threshold: result.threshold,
        status: result.status,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        createdBy: result.createdBy,
        expiresAt: result.expiresAt,
        memo: result.memo,
      };
    }),

  listReshares: protectedProcedure({ permission: null })
    .route({
      method: 'GET',
      path: '/vaults/{vaultId}/reshares',
      tags,
    })
    .input(zReshareListParams)
    .output(zReshareListResponse)
    .handler(async ({ context, input }) => {
      context.logger.info(`Fetching reshares for vault: ${input.vaultId}`);

      // Get auth token for vault API
      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      const reshareRepo = new ReshareRepository(token);
      // Note: Type assertion needed due to OpenAPI path mismatch in generated types
      const result = (await reshareRepo.list(input.vaultId, {
        limit: input.limit,
        cursor: input.cursor,
        status: input.status,
      })) as {
        data: Array<{
          id: string;
          vaultId: string;
          threshold: number;
          status:
            | 'voting'
            | 'completed'
            | 'failed'
            | 'expired'
            | 'signing'
            | 'rejected';
          memo?: string | null;
          createdAt: string;
          updatedAt: string;
          createdBy: string;
          expiresAt: string;
        }>;
        nextCursor?: string | null;
        hasMore: boolean;
      };

      return {
        data: result.data.map((reshare) => ({
          id: reshare.id,
          vaultId: reshare.vaultId,
          threshold: reshare.threshold,
          status: reshare.status,
          memo: reshare.memo ?? null,
          createdAt: reshare.createdAt,
          updatedAt: reshare.updatedAt,
          createdBy: reshare.createdBy,
          expiresAt: reshare.expiresAt,
        })),
        nextCursor: result.nextCursor ?? null,
        hasMore: result.hasMore,
      };
    }),

  getReshare: protectedProcedure({ permission: null })
    .route({
      method: 'GET',
      path: '/vaults/{vaultId}/reshares/{reshareId}',
      tags,
    })
    .input(zGetReshareParams)
    .output(zReshare)
    .handler(async ({ context, input }) => {
      context.logger.info(
        `Fetching reshare ${input.reshareId} for vault ${input.vaultId}`
      );

      // Get auth token for vault API
      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      const reshareRepo = new ReshareRepository(token);
      // Note: Type assertion needed due to OpenAPI path mismatch in generated types
      const result = (await reshareRepo.get(
        input.vaultId,
        input.reshareId
      )) as {
        id: string;
        vaultId: string;
        threshold: number;
        status:
          | 'voting'
          | 'completed'
          | 'failed'
          | 'expired'
          | 'signing'
          | 'rejected';
        memo?: string | null;
        createdAt: string;
        updatedAt: string;
        createdBy: string;
        expiresAt: string;
      };

      return {
        id: result.id,
        vaultId: result.vaultId,
        threshold: result.threshold,
        status: result.status,
        memo: result.memo ?? null,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        createdBy: result.createdBy,
        expiresAt: result.expiresAt,
      };
    }),

  getReshareVotes: protectedProcedure({ permission: null })
    .route({
      method: 'GET',
      path: '/vaults/{vaultId}/reshares/{reshareId}/votes',
      tags,
    })
    .input(zGetReshareParams)
    .output(zReshareVotesResponse)
    .handler(async ({ context, input }) => {
      context.logger.info(
        `Fetching votes for reshare ${input.reshareId} in vault ${input.vaultId}`
      );

      // Get auth token for vault API
      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      const reshareRepo = new ReshareRepository(token);
      // Note: Type assertion needed due to OpenAPI path mismatch in generated types
      const result = (await reshareRepo.getVotes(
        input.vaultId,
        input.reshareId
      )) as Array<{
        id: string;
        signerId: string;
        signerExternalId: string | null;
        reshareId: string;
        weight: number;
        oldWeight: number;
        changeType: 'added' | 'removed' | 'kept';
        result: 'approve' | 'reject';
        votedAt: string;
        approvalSignature: string | null;
      }>;

      return result.map((vote) => ({
        id: vote.id,
        signerId: vote.signerId,
        signerExternalId: vote.signerExternalId,
        reshareId: vote.reshareId,
        weight: vote.weight,
        oldWeight: vote.oldWeight,
        changeType: vote.changeType,
        result: vote.result,
        votedAt: vote.votedAt,
        approvalSignature: vote.approvalSignature,
      }));
    }),

  listSignatures: protectedProcedure({ permission: null })
    .route({
      method: 'GET',
      path: '/vaults/{vaultId}/signatures',
      tags,
    })
    .input(zSignatureListParams)
    .output(zSignatureListResponse)
    .handler(async ({ context, input }) => {
      context.logger.info(`Fetching signatures for vault: ${input.vaultId}`);

      // Get auth token for vault API
      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      const signatureRepo = new SignatureRepository(token);
      // Note: Type assertion needed due to OpenAPI path mismatch in generated types
      const result = (await signatureRepo.list(input.vaultId, {
        limit: input.limit,
        cursor: input.cursor,
        order: input.order,
        status: input.status,
      })) as {
        data: Array<{
          id: string;
          vaultId: string;
          status:
            | 'voting'
            | 'presigning'
            | 'signing'
            | 'completed'
            | 'rejected'
            | 'expired'
            | 'failed';
          data: string[];
          chainId: number | null;
          coseAlgorithm: 'eddsa' | 'eddsa_blake2b' | 'es256k' | 'eskec256';
          derivationPath: string | null;
          contentType:
            | 'application/octet-stream+hex'
            | 'application/octet-stream+base64'
            | 'text/plain'
            | 'application/x-eip712+json';
          signature: string[] | null;
          createdAt: string;
          updatedAt: string;
          createdBy: string;
        }>;
        nextCursor?: string | null;
        hasMore: boolean;
      };

      return {
        data: result.data.map((sig) => ({
          id: sig.id,
          vaultId: sig.vaultId,
          status: sig.status,
          data: sig.data,
          chainId: sig.chainId,
          coseAlgorithm: sig.coseAlgorithm,
          derivationPath: sig.derivationPath,
          contentType: sig.contentType,
          signature: sig.signature,
          createdAt: sig.createdAt,
          updatedAt: sig.updatedAt,
          createdBy: sig.createdBy,
        })),
        nextCursor: result.nextCursor ?? null,
        hasMore: result.hasMore,
      };
    }),

  getSignature: protectedProcedure({ permission: null })
    .route({
      method: 'GET',
      path: '/vaults/{vaultId}/signatures/{signatureId}',
      tags,
    })
    .input(zGetSignatureParams)
    .output(zSignatureItem)
    .handler(async ({ context, input }) => {
      context.logger.info(
        `Fetching signature ${input.signatureId} for vault ${input.vaultId}`
      );

      // Get auth token for vault API
      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      const signatureRepo = new SignatureRepository(token);
      // Note: Type assertion needed due to OpenAPI path mismatch in generated types
      const result = (await signatureRepo.get(
        input.vaultId,
        input.signatureId
      )) as {
        id: string;
        vaultId: string;
        status:
          | 'voting'
          | 'presigning'
          | 'signing'
          | 'completed'
          | 'rejected'
          | 'expired'
          | 'failed';
        data: string[];
        chainId: number | null;
        coseAlgorithm: 'eddsa' | 'eddsa_blake2b' | 'es256k' | 'eskec256';
        derivationPath: string | null;
        contentType:
          | 'application/octet-stream+hex'
          | 'application/octet-stream+base64'
          | 'text/plain'
          | 'application/x-eip712+json';
        signature: string[] | null;
        createdAt: string;
        updatedAt: string;
        createdBy: string;
      };

      return {
        id: result.id,
        vaultId: result.vaultId,
        status: result.status,
        data: result.data,
        chainId: result.chainId,
        coseAlgorithm: result.coseAlgorithm,
        derivationPath: result.derivationPath,
        contentType: result.contentType,
        signature: result.signature,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        createdBy: result.createdBy,
      };
    }),
};
