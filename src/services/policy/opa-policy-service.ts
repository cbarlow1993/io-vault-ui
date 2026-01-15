import type { RbacRepository } from '@/src/repositories/rbac.repository.js';
import type { OpaClient } from './opa-client.js';
import type { PolicyService, PolicyDecision } from './types.js';
import { LocalPolicyService } from './policy-service.js';
import { logger } from '@/utils/powertools.js';

export class OpaPolicyService implements PolicyService {
  private localPolicyService: LocalPolicyService;

  constructor(
    private opaClient: OpaClient,
    private rbacRepository: RbacRepository
  ) {
    this.localPolicyService = new LocalPolicyService(rbacRepository);
  }

  async checkAccess(params: {
    userId: string;
    organisationId: string;
    module: string;
    action: string;
    resource?: { vaultId?: string };
  }): Promise<PolicyDecision> {
    const userWithRoles = await this.rbacRepository.getUserWithRoles(
      params.userId,
      params.organisationId
    );

    try {
      return await this.opaClient.evaluate({
        user: {
          id: userWithRoles.userId,
          globalRole: userWithRoles.globalRole,
          moduleRoles: userWithRoles.moduleRoles,
        },
        module: params.module,
        action: params.action,
        resource: params.resource ?? {},
      });
    } catch (error) {
      logger.warn('OPA evaluation failed, falling back to local evaluation', { error });
      return this.localPolicyService.checkAccess(params);
    }
  }
}
