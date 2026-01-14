import { auth as clerkAuth } from '@clerk/tanstack-react-start/server';
import { ORPCError } from '@orpc/client';

import {
  zSignerListParams,
  zSignerListResponse,
} from '@/features/signers/schema';
import { protectedProcedure } from '@/server/orpc';
import { SignerRepository } from '@/server/vault-api/repositories';

const tags = ['signers'];

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
        // Pass filter params when API supports them
        // status: input?.status,
        // type: input?.type,
        // search: input?.search,
      });

      // TODO: Remove this transformation when API returns full signer data
      // For now, map API response to expected UI format
      return result as unknown as typeof zSignerListResponse._output;
    }),
};
