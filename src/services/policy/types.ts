import type { ResourceScope, GlobalRole } from '@/src/lib/database/types.js';

export interface PolicyInput {
  user: {
    id: string;
    globalRole: GlobalRole | null;
    moduleRoles: Array<{
      module: string;
      role: string;
      resourceScope: ResourceScope | null;
    }>;
  };
  module: string;
  action: string;
  resource: {
    vaultId?: string;
  };
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  matchedRole?: string;
}

export interface PolicyService {
  checkAccess(params: {
    userId: string;
    organisationId: string;
    module: string;
    action: string;
    resource?: { vaultId?: string };
  }): Promise<PolicyDecision>;
}
