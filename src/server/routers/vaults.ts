import { auth as clerkAuth } from '@clerk/tanstack-react-start/server';
import { ORPCError } from '@orpc/client';

import type { Vault, VaultCurve, VaultStatus } from '@/features/vaults/schema';
import {
  zCreateReshareInput,
  zCreateReshareResponse,
  zCreateVaultInput,
  zCreateVaultResponse,
  zGetVaultParams,
  zVault,
  zVaultListParams,
  zVaultListResponse,
} from '@/features/vaults/schema';
import { protectedProcedure } from '@/server/orpc';
import {
  ReshareRepository,
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
};
