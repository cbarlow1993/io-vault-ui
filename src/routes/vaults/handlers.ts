import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateVaultBody } from '@/src/routes/vaults/schemas.js';
import type { ElipticCurve } from '@/src/lib/database/types.js';

/**
 * Create a vault with curves
 * POST /v2/vaults
 */
export async function createVault(
  request: FastifyRequest<{
    Body: CreateVaultBody;
  }>,
  reply: FastifyReply
) {
  const { id, workspaceId, curves } = request.body;
  const { organisationId } = request.auth!;

  // Create vault through service (handles business logic and validation)
  const vault = await request.server.services.vault.createVaultWithCurves({
    id,
    workspaceId,
    organizationId: organisationId,
    curves: curves.map((c) => ({
      curveType: c.curveType as ElipticCurve,
      xpub: c.xpub,
    })),
  });

  return reply.status(201).send(vault.toAPIResponse());
}
