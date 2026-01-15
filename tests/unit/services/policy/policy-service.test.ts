import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalPolicyService } from '@/src/services/policy/policy-service.js';
import type { RbacRepository, UserWithRoles } from '@/src/repositories/rbac.repository.js';

// Create mock RBAC repository
function createMockRbacRepository() {
  return {
    getUserWithRoles: vi.fn(),
    getModuleRolePermissions: vi.fn(),
    getAllRolePermissions: vi.fn(),
    findModuleByName: vi.fn(),
    findModuleRoleByName: vi.fn(),
    assignGlobalRole: vi.fn(),
    removeGlobalRole: vi.fn(),
    assignModuleRole: vi.fn(),
    removeModuleRole: vi.fn(),
    listModules: vi.fn(),
    listModuleRoles: vi.fn(),
    listModuleActions: vi.fn(),
  } satisfies RbacRepository;
}

describe('LocalPolicyService', () => {
  let mockRepository: ReturnType<typeof createMockRbacRepository>;
  let policyService: LocalPolicyService;

  beforeEach(() => {
    mockRepository = createMockRbacRepository();
    policyService = new LocalPolicyService(mockRepository);
  });

  describe('checkAccess', () => {
    describe('owner bypass', () => {
      it('should allow access for owner regardless of module/action', async () => {
        const userWithRoles: UserWithRoles = {
          userId: 'user-123',
          organisationId: 'org-456',
          globalRole: 'owner',
          moduleRoles: [],
        };
        mockRepository.getUserWithRoles.mockResolvedValue(userWithRoles);

        const result = await policyService.checkAccess({
          userId: 'user-123',
          organisationId: 'org-456',
          module: 'treasury',
          action: 'initiate_transfer',
          resource: { vaultId: 'vault-1' },
        });

        expect(result).toEqual({
          allowed: true,
          reason: 'Owner has full access',
          matchedRole: 'owner',
        });
        expect(mockRepository.getUserWithRoles).toHaveBeenCalledWith('user-123', 'org-456');
        // Should not check permissions for owner
        expect(mockRepository.getModuleRolePermissions).not.toHaveBeenCalled();
      });

      it('should allow owner access without specifying resource', async () => {
        const userWithRoles: UserWithRoles = {
          userId: 'user-123',
          organisationId: 'org-456',
          globalRole: 'owner',
          moduleRoles: [],
        };
        mockRepository.getUserWithRoles.mockResolvedValue(userWithRoles);

        const result = await policyService.checkAccess({
          userId: 'user-123',
          organisationId: 'org-456',
          module: 'compliance',
          action: 'view_audit_logs',
        });

        expect(result).toEqual({
          allowed: true,
          reason: 'Owner has full access',
          matchedRole: 'owner',
        });
      });
    });

    describe('module role with matching permission', () => {
      it('should allow access when user has module role with required permission', async () => {
        const userWithRoles: UserWithRoles = {
          userId: 'user-123',
          organisationId: 'org-456',
          globalRole: null,
          moduleRoles: [
            {
              module: 'treasury',
              role: 'treasurer',
              resourceScope: null,
            },
          ],
        };
        mockRepository.getUserWithRoles.mockResolvedValue(userWithRoles);
        mockRepository.getModuleRolePermissions.mockResolvedValue([
          'view_balances',
          'initiate_transfer',
          'view_transactions',
        ]);

        const result = await policyService.checkAccess({
          userId: 'user-123',
          organisationId: 'org-456',
          module: 'treasury',
          action: 'initiate_transfer',
        });

        expect(result).toEqual({
          allowed: true,
          reason: 'Permission granted by role',
          matchedRole: 'treasury:treasurer',
        });
        expect(mockRepository.getModuleRolePermissions).toHaveBeenCalledWith('treasury', 'treasurer');
      });

      it('should allow access with resource when user has module-wide scope (null)', async () => {
        const userWithRoles: UserWithRoles = {
          userId: 'user-123',
          organisationId: 'org-456',
          globalRole: null,
          moduleRoles: [
            {
              module: 'treasury',
              role: 'admin',
              resourceScope: null, // null = full module access
            },
          ],
        };
        mockRepository.getUserWithRoles.mockResolvedValue(userWithRoles);
        mockRepository.getModuleRolePermissions.mockResolvedValue(['initiate_transfer']);

        const result = await policyService.checkAccess({
          userId: 'user-123',
          organisationId: 'org-456',
          module: 'treasury',
          action: 'initiate_transfer',
          resource: { vaultId: 'any-vault-id' },
        });

        expect(result).toEqual({
          allowed: true,
          reason: 'Permission granted by role',
          matchedRole: 'treasury:admin',
        });
      });
    });

    describe('no role for module', () => {
      it('should deny access when user has no role for the requested module', async () => {
        const userWithRoles: UserWithRoles = {
          userId: 'user-123',
          organisationId: 'org-456',
          globalRole: null,
          moduleRoles: [
            {
              module: 'compliance',
              role: 'auditor',
              resourceScope: null,
            },
          ],
        };
        mockRepository.getUserWithRoles.mockResolvedValue(userWithRoles);

        const result = await policyService.checkAccess({
          userId: 'user-123',
          organisationId: 'org-456',
          module: 'treasury',
          action: 'initiate_transfer',
        });

        expect(result).toEqual({
          allowed: false,
          reason: 'No role assigned for module: treasury',
        });
        // Should not check permissions if no role for module
        expect(mockRepository.getModuleRolePermissions).not.toHaveBeenCalled();
      });

      it('should deny access when user has no roles at all', async () => {
        const userWithRoles: UserWithRoles = {
          userId: 'user-123',
          organisationId: 'org-456',
          globalRole: null,
          moduleRoles: [],
        };
        mockRepository.getUserWithRoles.mockResolvedValue(userWithRoles);

        const result = await policyService.checkAccess({
          userId: 'user-123',
          organisationId: 'org-456',
          module: 'treasury',
          action: 'view_balances',
        });

        expect(result).toEqual({
          allowed: false,
          reason: 'No role assigned for module: treasury',
        });
      });
    });

    describe('role without required permission', () => {
      it('should deny access when user has role but lacks the required permission', async () => {
        const userWithRoles: UserWithRoles = {
          userId: 'user-123',
          organisationId: 'org-456',
          globalRole: null,
          moduleRoles: [
            {
              module: 'treasury',
              role: 'viewer',
              resourceScope: null,
            },
          ],
        };
        mockRepository.getUserWithRoles.mockResolvedValue(userWithRoles);
        mockRepository.getModuleRolePermissions.mockResolvedValue(['view_balances', 'view_transactions']);

        const result = await policyService.checkAccess({
          userId: 'user-123',
          organisationId: 'org-456',
          module: 'treasury',
          action: 'initiate_transfer', // Not in the viewer's permissions
        });

        expect(result).toEqual({
          allowed: false,
          reason: 'Role treasury:viewer does not have permission for action: initiate_transfer',
        });
      });

      it('should deny access when role has no permissions', async () => {
        const userWithRoles: UserWithRoles = {
          userId: 'user-123',
          organisationId: 'org-456',
          globalRole: null,
          moduleRoles: [
            {
              module: 'treasury',
              role: 'restricted',
              resourceScope: null,
            },
          ],
        };
        mockRepository.getUserWithRoles.mockResolvedValue(userWithRoles);
        mockRepository.getModuleRolePermissions.mockResolvedValue([]);

        const result = await policyService.checkAccess({
          userId: 'user-123',
          organisationId: 'org-456',
          module: 'treasury',
          action: 'view_balances',
        });

        expect(result).toEqual({
          allowed: false,
          reason: 'Role treasury:restricted does not have permission for action: view_balances',
        });
      });
    });

    describe('resource scope restrictions', () => {
      it('should allow access when vaultId is in the scope vault_ids', async () => {
        const userWithRoles: UserWithRoles = {
          userId: 'user-123',
          organisationId: 'org-456',
          globalRole: null,
          moduleRoles: [
            {
              module: 'treasury',
              role: 'treasurer',
              resourceScope: { vault_ids: ['vault-1', 'vault-2', 'vault-3'] },
            },
          ],
        };
        mockRepository.getUserWithRoles.mockResolvedValue(userWithRoles);
        mockRepository.getModuleRolePermissions.mockResolvedValue(['initiate_transfer']);

        const result = await policyService.checkAccess({
          userId: 'user-123',
          organisationId: 'org-456',
          module: 'treasury',
          action: 'initiate_transfer',
          resource: { vaultId: 'vault-2' },
        });

        expect(result).toEqual({
          allowed: true,
          reason: 'Permission granted by role',
          matchedRole: 'treasury:treasurer',
        });
      });

      it('should deny access when vaultId is not in the scope vault_ids', async () => {
        const userWithRoles: UserWithRoles = {
          userId: 'user-123',
          organisationId: 'org-456',
          globalRole: null,
          moduleRoles: [
            {
              module: 'treasury',
              role: 'treasurer',
              resourceScope: { vault_ids: ['vault-1', 'vault-2'] },
            },
          ],
        };
        mockRepository.getUserWithRoles.mockResolvedValue(userWithRoles);
        mockRepository.getModuleRolePermissions.mockResolvedValue(['initiate_transfer']);

        const result = await policyService.checkAccess({
          userId: 'user-123',
          organisationId: 'org-456',
          module: 'treasury',
          action: 'initiate_transfer',
          resource: { vaultId: 'vault-999' }, // Not in scope
        });

        expect(result).toEqual({
          allowed: false,
          reason: 'Resource vault-999 is outside of permitted scope',
        });
        // Should not check permissions if scope check fails
        expect(mockRepository.getModuleRolePermissions).not.toHaveBeenCalled();
      });

      it('should allow access when no resource is specified even with vault scope', async () => {
        const userWithRoles: UserWithRoles = {
          userId: 'user-123',
          organisationId: 'org-456',
          globalRole: null,
          moduleRoles: [
            {
              module: 'treasury',
              role: 'treasurer',
              resourceScope: { vault_ids: ['vault-1'] },
            },
          ],
        };
        mockRepository.getUserWithRoles.mockResolvedValue(userWithRoles);
        mockRepository.getModuleRolePermissions.mockResolvedValue(['list_vaults']);

        // Action that doesn't require a specific resource (e.g., listing)
        const result = await policyService.checkAccess({
          userId: 'user-123',
          organisationId: 'org-456',
          module: 'treasury',
          action: 'list_vaults',
          // No resource specified
        });

        expect(result).toEqual({
          allowed: true,
          reason: 'Permission granted by role',
          matchedRole: 'treasury:treasurer',
        });
      });

      it('should deny when scope has vault_ids but resource has no vaultId', async () => {
        const userWithRoles: UserWithRoles = {
          userId: 'user-123',
          organisationId: 'org-456',
          globalRole: null,
          moduleRoles: [
            {
              module: 'treasury',
              role: 'treasurer',
              resourceScope: { vault_ids: ['vault-1'] },
            },
          ],
        };
        mockRepository.getUserWithRoles.mockResolvedValue(userWithRoles);
        mockRepository.getModuleRolePermissions.mockResolvedValue(['initiate_transfer']);

        const result = await policyService.checkAccess({
          userId: 'user-123',
          organisationId: 'org-456',
          module: 'treasury',
          action: 'initiate_transfer',
          resource: {}, // Empty resource object - vaultId required for scoped action
        });

        expect(result).toEqual({
          allowed: false,
          reason: 'Resource vaultId required for scoped access',
        });
      });

      it('should allow access with empty vault_ids array (interpreted as no vault restrictions)', async () => {
        const userWithRoles: UserWithRoles = {
          userId: 'user-123',
          organisationId: 'org-456',
          globalRole: null,
          moduleRoles: [
            {
              module: 'treasury',
              role: 'admin',
              resourceScope: { vault_ids: [] }, // Empty array = no vault restrictions
            },
          ],
        };
        mockRepository.getUserWithRoles.mockResolvedValue(userWithRoles);
        mockRepository.getModuleRolePermissions.mockResolvedValue(['initiate_transfer']);

        const result = await policyService.checkAccess({
          userId: 'user-123',
          organisationId: 'org-456',
          module: 'treasury',
          action: 'initiate_transfer',
          resource: { vaultId: 'any-vault' },
        });

        expect(result).toEqual({
          allowed: true,
          reason: 'Permission granted by role',
          matchedRole: 'treasury:admin',
        });
      });
    });

    describe('global roles other than owner', () => {
      it('should check module permissions for admin global role', async () => {
        const userWithRoles: UserWithRoles = {
          userId: 'user-123',
          organisationId: 'org-456',
          globalRole: 'admin',
          moduleRoles: [
            {
              module: 'treasury',
              role: 'viewer',
              resourceScope: null,
            },
          ],
        };
        mockRepository.getUserWithRoles.mockResolvedValue(userWithRoles);
        mockRepository.getModuleRolePermissions.mockResolvedValue(['view_balances']);

        const result = await policyService.checkAccess({
          userId: 'user-123',
          organisationId: 'org-456',
          module: 'treasury',
          action: 'initiate_transfer',
        });

        // Admin does NOT get automatic bypass - must have module permission
        expect(result).toEqual({
          allowed: false,
          reason: 'Role treasury:viewer does not have permission for action: initiate_transfer',
        });
      });

      it('should check module permissions for billing global role', async () => {
        const userWithRoles: UserWithRoles = {
          userId: 'user-123',
          organisationId: 'org-456',
          globalRole: 'billing',
          moduleRoles: [],
        };
        mockRepository.getUserWithRoles.mockResolvedValue(userWithRoles);

        const result = await policyService.checkAccess({
          userId: 'user-123',
          organisationId: 'org-456',
          module: 'treasury',
          action: 'view_balances',
        });

        // Billing does NOT get automatic module access
        expect(result).toEqual({
          allowed: false,
          reason: 'No role assigned for module: treasury',
        });
      });
    });
  });
});
