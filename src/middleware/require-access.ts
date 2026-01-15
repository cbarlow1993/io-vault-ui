import type { FastifyRequest, FastifyReply } from 'fastify';

type PreHandlerFunction = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

/**
 * Creates a preHandler that checks module/action access.
 * Extracts vaultId from request params if present.
 */
export function requireAccess(module: string, action: string): PreHandlerFunction {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const params = request.params as Record<string, string>;
    const vaultId = params?.vaultId;

    await request.requireAccess(module, action, { vaultId });
  };
}
