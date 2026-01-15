import { auth as clerkAuth } from '@clerk/tanstack-react-start/server';
import { ORPCError } from '@orpc/client';

import type { Signer, SignerConfig } from '@/features/signers/schema';
import {
  zSignerListParams,
  zSignerListResponse,
} from '@/features/signers/schema';
import { protectedProcedure } from '@/server/orpc';
import { SignerRepository } from '@/server/vault-api/repositories';
import type { Signer as ApiSigner } from '@/server/vault-api/types';

const tags = ['signers'];

/**
 * Transform API signer response to UI signer format.
 * TODO: Remove this when API returns full signer data.
 */
function mapApiSignerToUiSigner(apiSigner: ApiSigner): Signer {
  // Default config for signers until API provides this data
  const defaultConfig: SignerConfig = {
    publicKey: apiSigner.publicKey,
    supportedCurves: ['ECDSA'],
    autoApprove: false,
    notificationsEnabled: true,
    allowedNetworks: ['ethereum'],
    backupEnabled: false,
    lastSyncAt: apiSigner.updatedAt,
  };

  return {
    id: apiSigner.id,
    name: apiSigner.name,
    owner: apiSigner.createdBy, // Map createdBy to owner until API provides owner name
    type: 'virtual', // Default to virtual until API provides type
    version: '1.0.0', // Placeholder until API provides version
    status: 'active', // Default to active until API provides status
    registeredAt: apiSigner.createdAt,
    lastSeen: null, // Not available in current API
    deviceInfo: apiSigner.description ?? undefined,
    vaultsCount: 0, // Not available in current API
    config: defaultConfig,
  };
}

/**
 * Filter signers client-side until API supports these filters.
 */
function filterSigners(
  signers: Signer[],
  params?: { status?: string; type?: string; search?: string }
): Signer[] {
  if (!params) return signers;

  return signers.filter((signer) => {
    // Status filter
    if (params.status && signer.status !== params.status) {
      return false;
    }

    // Type filter
    if (params.type && signer.type !== params.type) {
      return false;
    }

    // Search filter (by name or owner)
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      const matchesName = signer.name.toLowerCase().includes(searchLower);
      const matchesOwner = signer.owner.toLowerCase().includes(searchLower);
      if (!matchesName && !matchesOwner) {
        return false;
      }
    }

    return true;
  });
}

export default {
  list: protectedProcedure({ permission: null })
    .route({
      method: 'GET',
      path: '/signers',
      tags,
    })
    .input(zSignerListParams.optional())
    .output(zSignerListResponse)
    .handler(async ({ context, input }) => {
      context.logger.info('Fetching signers list');

      // Get auth token for vault API
      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      const signerRepo = new SignerRepository(token);
      const result = await signerRepo.list({
        limit: input?.limit,
        cursor: input?.cursor,
      });

      // Transform API response to UI format with placeholder values
      // TODO: Remove transformation when API returns full signer data
      const transformedSigners = result.data.map(mapApiSignerToUiSigner);

      // Apply client-side filters until API supports them
      const filteredSigners = filterSigners(transformedSigners, {
        status: input?.status,
        type: input?.type,
        search: input?.search,
      });

      return {
        data: filteredSigners,
        nextCursor: result.nextCursor ?? null,
        hasMore: result.hasMore,
      };
    }),
};
