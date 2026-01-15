import { randomUUID } from 'crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { NotFoundError, OperationForbiddenError } from '@iofinnet/errors-sdk';
import type { GlobalRole } from '@/src/lib/database/types.js';

interface AssignGlobalRoleParams {
  orgId: string;
  userId: string;
}

interface AssignGlobalRoleBody {
  role: GlobalRole;
}

export async function assignGlobalRole(
  request: FastifyRequest<{
    Params: AssignGlobalRoleParams;
    Body: AssignGlobalRoleBody;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { orgId, userId } = request.params;
  const { role } = request.body;

  // Only owner can assign global roles
  const currentUser = await request.server.rbacRepository.getUserWithRoles(
    request.auth!.userId,
    orgId
  );

  if (currentUser.globalRole !== 'owner') {
    throw new OperationForbiddenError('Only organization owner can assign global roles');
  }

  await request.server.rbacRepository.assignGlobalRole(userId, orgId, role, request.auth!.userId);

  const updatedUser = await request.server.rbacRepository.getUserWithRoles(userId, orgId);

  reply.status(200).send({
    id: randomUUID(),
    user_id: userId,
    organisation_id: orgId,
    role: updatedUser.globalRole,
    created_at: new Date().toISOString(),
  });
}

export async function removeGlobalRole(
  request: FastifyRequest<{ Params: AssignGlobalRoleParams }>,
  reply: FastifyReply
): Promise<void> {
  const { orgId, userId } = request.params;

  const currentUser = await request.server.rbacRepository.getUserWithRoles(
    request.auth!.userId,
    orgId
  );

  if (currentUser.globalRole !== 'owner') {
    throw new OperationForbiddenError('Only organization owner can remove global roles');
  }

  const removed = await request.server.rbacRepository.removeGlobalRole(userId, orgId);

  if (!removed) {
    throw new NotFoundError('User does not have a global role');
  }

  reply.status(204).send();
}

interface AssignModuleRoleBody {
  module_id: string;
  role: string;
  resource_scope?: { vault_ids?: string[] } | null;
}

export async function assignModuleRole(
  request: FastifyRequest<{
    Params: AssignGlobalRoleParams;
    Body: AssignModuleRoleBody;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { orgId, userId } = request.params;
  const { module_id, role, resource_scope } = request.body;

  const currentUser = await request.server.rbacRepository.getUserWithRoles(
    request.auth!.userId,
    orgId
  );

  if (currentUser.globalRole !== 'owner' && currentUser.globalRole !== 'admin') {
    throw new OperationForbiddenError('Only owner or admin can assign module roles');
  }

  // Validate module exists (try by ID first, then by name)
  let moduleResult = await request.server.rbacRepository.findModuleById(module_id);
  if (!moduleResult) {
    moduleResult = await request.server.rbacRepository.findModuleByName(module_id);
  }
  if (!moduleResult) {
    throw new NotFoundError(`Module not found: ${module_id}`);
  }

  // Validate role exists for this module
  const moduleRole = await request.server.rbacRepository.findModuleRoleByName(
    moduleResult.id,
    role
  );
  if (!moduleRole) {
    throw new NotFoundError(`Role '${role}' not found for module '${moduleResult.name}'`);
  }

  await request.server.rbacRepository.assignModuleRole({
    userId,
    organisationId: orgId,
    moduleId: moduleResult.id,
    moduleRoleId: moduleRole.id,
    resourceScope: resource_scope ?? null,
    grantedBy: request.auth!.userId,
  });

  reply.status(201).send({
    id: randomUUID(),
    user_id: userId,
    module: moduleResult.name,
    role: role,
    resource_scope: resource_scope ?? null,
    granted_by: request.auth!.userId,
    created_at: new Date().toISOString(),
  });
}

export async function removeModuleRole(
  request: FastifyRequest<{
    Params: { orgId: string; userId: string; moduleId: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { orgId, userId, moduleId } = request.params;

  const currentUser = await request.server.rbacRepository.getUserWithRoles(
    request.auth!.userId,
    orgId
  );

  if (currentUser.globalRole !== 'owner' && currentUser.globalRole !== 'admin') {
    throw new OperationForbiddenError('Only owner or admin can remove module roles');
  }

  const removed = await request.server.rbacRepository.removeModuleRole(userId, orgId, moduleId);

  if (!removed) {
    throw new NotFoundError('User does not have this module role');
  }

  reply.status(204).send();
}

export async function getUserRoles(
  request: FastifyRequest<{ Params: { orgId: string; userId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { orgId, userId } = request.params;

  const userWithRoles = await request.server.rbacRepository.getUserWithRoles(userId, orgId);

  reply.send({
    user_id: userWithRoles.userId,
    organisation_id: userWithRoles.organisationId,
    global_role: userWithRoles.globalRole,
    module_roles: userWithRoles.moduleRoles.map((mr) => ({
      module: mr.module,
      role: mr.role,
      resource_scope: mr.resourceScope,
    })),
  });
}
