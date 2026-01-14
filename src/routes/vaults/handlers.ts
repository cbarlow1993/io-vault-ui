import { DuplicateError } from '@iofinnet/errors-sdk';
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

  // Check if vault already exists
  const exists = await request.server.services.vault.vaultExists(id);
  if (exists) {
    throw new DuplicateError(`Vault with id ${id} already exists`);
  }

  // Create vault with curves
  const result = await request.server.services.vault.createVaultWithCurves(
    {
      id,
      workspaceId,
      organisationId,
    },
    curves.map((c) => ({
      vaultId: id,
      curve: c.curveType as ElipticCurve,
      xpub: c.xpub,
    }))
  );

  // Format response
  const response = {
    id: result.vault.id,
    workspaceId: result.vault.workspaceId,
    organisationId: result.vault.organisationId,
    createdAt: result.vault.createdAt.toISOString(),
    curves: result.curves.map((c) => ({
      id: c.id,
      curveType: c.curve,
      xpub: c.xpub,
      createdAt: c.createdAt.toISOString(),
    })),
  };

  return reply.status(201).send(response);
}
