import type { FastifyRequest, FastifyReply } from 'fastify';
import { NotFoundError } from '@iofinnet/errors-sdk';

export async function listModules(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const modules = await request.server.rbacRepository.listModules();

  reply.send({
    modules: modules.map((m) => ({
      id: m.id,
      name: m.name,
      display_name: m.displayName,
      is_active: m.isActive,
    })),
  });
}

export async function listModuleRoles(
  request: FastifyRequest<{ Params: { moduleId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { moduleId } = request.params;

  const roles = await request.server.rbacRepository.listModuleRoles(moduleId);

  if (roles.length === 0) {
    // Check if module exists
    const module = await request.server.rbacRepository.findModuleById(moduleId);
    if (!module) {
      throw new NotFoundError(`Module not found: ${moduleId}`);
    }
  }

  reply.send({
    roles: roles.map((r) => ({
      id: r.id,
      name: r.name,
      display_name: r.displayName,
    })),
  });
}

export async function listModuleActions(
  request: FastifyRequest<{ Params: { moduleId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { moduleId } = request.params;

  const actions = await request.server.rbacRepository.listModuleActions(moduleId);

  if (actions.length === 0) {
    // Check if module exists
    const module = await request.server.rbacRepository.findModuleById(moduleId);
    if (!module) {
      throw new NotFoundError(`Module not found: ${moduleId}`);
    }
  }

  reply.send({
    actions: actions.map((a) => ({
      id: a.id,
      name: a.name,
      display_name: a.displayName,
    })),
  });
}
