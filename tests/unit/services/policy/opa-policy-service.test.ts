import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpaPolicyService } from '@/src/services/policy/opa-policy-service.js';
import type { OpaClient } from '@/src/services/policy/opa-client.js';
import type { RbacRepository } from '@/src/repositories/rbac.repository.js';

describe('OpaPolicyService', () => {
  let mockOpaClient: OpaClient;
  let mockRepository: RbacRepository;
  let service: OpaPolicyService;

  beforeEach(() => {
    mockOpaClient = {
      evaluate: vi.fn(),
    } as unknown as OpaClient;

    mockRepository = {
      getUserWithRoles: vi.fn(),
    } as unknown as RbacRepository;

    service = new OpaPolicyService(mockOpaClient, mockRepository);
  });

  it('should fetch user roles and call OPA client', async () => {
    vi.mocked(mockRepository.getUserWithRoles).mockResolvedValue({
      userId: 'user-1',
      organisationId: 'org-1',
      globalRole: null,
      moduleRoles: [{ module: 'treasury', role: 'admin', resourceScope: null }],
    });

    vi.mocked(mockOpaClient.evaluate).mockResolvedValue({
      allowed: true,
      matchedRole: 'treasury:admin',
    });

    const result = await service.checkAccess({
      userId: 'user-1',
      organisationId: 'org-1',
      module: 'treasury',
      action: 'view_balances',
    });

    expect(mockRepository.getUserWithRoles).toHaveBeenCalledWith('user-1', 'org-1');
    expect(mockOpaClient.evaluate).toHaveBeenCalled();
    expect(result.allowed).toBe(true);
  });

  it('should fall back to local evaluation when OPA is unavailable', async () => {
    vi.mocked(mockRepository.getUserWithRoles).mockResolvedValue({
      userId: 'user-1',
      organisationId: 'org-1',
      globalRole: 'owner',
      moduleRoles: [],
    });

    vi.mocked(mockOpaClient.evaluate).mockRejectedValue(new Error('Connection refused'));

    const result = await service.checkAccess({
      userId: 'user-1',
      organisationId: 'org-1',
      module: 'treasury',
      action: 'view_balances',
    });

    // Should still work because owner bypasses checks
    expect(result.allowed).toBe(true);
  });

  it('should deny non-owner when OPA is unavailable', async () => {
    vi.mocked(mockRepository.getUserWithRoles).mockResolvedValue({
      userId: 'user-1',
      organisationId: 'org-1',
      globalRole: null,  // not an owner
      moduleRoles: [{ module: 'treasury', role: 'admin', resourceScope: null }],
    });

    vi.mocked(mockOpaClient.evaluate).mockRejectedValue(new Error('Connection refused'));

    const result = await service.checkAccess({
      userId: 'user-1',
      organisationId: 'org-1',
      module: 'treasury',
      action: 'view_balances',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Policy evaluation unavailable, please retry');
  });
});
