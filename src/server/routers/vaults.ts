import { auth as clerkAuth } from '@clerk/tanstack-react-start/server';
import { ORPCError } from '@orpc/client';

import type { Vault, VaultCurve, VaultStatus } from '@/features/vaults/schema';
import { zVaultListParams, zVaultListResponse } from '@/features/vaults/schema';
import { protectedProcedure } from '@/server/orpc';
import { VaultRepository } from '@/server/vault-api/repositories';

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

/**
 * Map API status to UI status.
 * API: draft | active | archived
 * UI: pending | active | revoked
 */
function mapApiStatusToUi(status: ApiVaultStatus): VaultStatus {
  switch (status) {
    case 'draft':
      return 'pending';
    case 'active':
      return 'active';
    case 'archived':
      return 'revoked';
  }
}

/**
 * Map UI status to API status for filtering.
 */
function mapUiStatusToApi(status: VaultStatus): ApiVaultStatus {
  switch (status) {
    case 'pending':
      return 'draft';
    case 'active':
      return 'active';
    case 'revoked':
      return 'archived';
  }
}

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
    status: mapApiStatusToUi(apiVault.status),
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

      // Map UI status to API status for filtering
      const apiStatus = input?.status
        ? mapUiStatusToApi(input.status)
        : undefined;

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
};
