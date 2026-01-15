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
      getModuleRolePermissions: vi.fn(),
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
    // Per FR-6: Owner does NOT bypass module checks
    // When OPA fails, we fall back to LocalPolicyService which requires module role
    vi.mocked(mockRepository.getUserWithRoles).mockResolvedValue({
      userId: 'user-1',
      organisationId: 'org-1',
      globalRole: 'owner',
      moduleRoles: [{ module: 'treasury', role: 'admin', resourceScope: null }],
    });

    vi.mocked(mockRepository.getModuleRolePermissions).mockResolvedValue(['view_balances', 'initiate_transfer']);

    vi.mocked(mockOpaClient.evaluate).mockRejectedValue(new Error('Connection refused'));

    const result = await service.checkAccess({
      userId: 'user-1',
      organisationId: 'org-1',
      module: 'treasury',
      action: 'view_balances',
    });

    // Should work because user has module role with permission
    expect(result.allowed).toBe(true);
    expect(result.matchedRole).toBe('treasury:admin');
  });

  it('should deny owner without module role when OPA is unavailable', async () => {
    // Per FR-6: Owner does NOT bypass module checks
    vi.mocked(mockRepository.getUserWithRoles).mockResolvedValue({
      userId: 'user-1',
      organisationId: 'org-1',
      globalRole: 'owner',
      moduleRoles: [], // No module role
    });

    vi.mocked(mockOpaClient.evaluate).mockRejectedValue(new Error('Connection refused'));

    const result = await service.checkAccess({
      userId: 'user-1',
      organisationId: 'org-1',
      module: 'treasury',
      action: 'view_balances',
    });

    // Should be denied because owner has no module role
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('No role assigned for module: treasury');
  });

  it('should deny user when OPA unavailable and user lacks permission', async () => {
    vi.mocked(mockRepository.getUserWithRoles).mockResolvedValue({
      userId: 'user-1',
      organisationId: 'org-1',
      globalRole: null,
      moduleRoles: [{ module: 'treasury', role: 'viewer', resourceScope: null }],
    });

    vi.mocked(mockRepository.getModuleRolePermissions).mockResolvedValue(['view_balances']); // No initiate_transfer

    vi.mocked(mockOpaClient.evaluate).mockRejectedValue(new Error('Connection refused'));

    const result = await service.checkAccess({
      userId: 'user-1',
      organisationId: 'org-1',
      module: 'treasury',
      action: 'initiate_transfer', // Not in permissions
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Role treasury:viewer does not have permission for action: initiate_transfer');
  });
});
