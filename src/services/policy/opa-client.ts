import type { PolicyInput, PolicyDecision } from './types.js';

export class OpaError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'OpaError';
  }
}

export class OpaClient {
  private timeoutMs: number;

  constructor(
    private baseUrl: string,
    options?: { timeoutMs?: number }
  ) {
    this.timeoutMs = options?.timeoutMs ?? 5000; // 5 second default
  }

  async evaluate(input: PolicyInput): Promise<PolicyDecision> {
    const opaInput = {
      input: {
        user: {
          id: input.user.id,
          global_role: input.user.globalRole,
          module_roles: input.user.moduleRoles.map((mr) => ({
            module: mr.module,
            role: mr.role,
            resource_scope: mr.resourceScope,
          })),
        },
        module: input.module,
        action: input.action,
        resource: input.resource,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(
        `${this.baseUrl}/v1/data/rbac/access/decision`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(opaInput),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new OpaError(
          `OPA request failed: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      const result = data.result;

      if (!result || typeof result.allowed !== 'boolean') {
        throw new OpaError('Invalid OPA response: missing or malformed result');
      }

      return {
        allowed: result.allowed,
        reason: result.reason,
        matchedRole: result.matched_role,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
