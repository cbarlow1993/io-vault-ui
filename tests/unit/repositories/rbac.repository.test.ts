import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresRbacRepository } from '@/src/repositories/rbac.repository.js';
import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';

// Create mock Kysely instance
function createMockDb() {
  const mockExecuteTakeFirst = vi.fn();
  const mockExecute = vi.fn();

  const chainable = {
    selectAll: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    execute: mockExecute,
    executeTakeFirst: mockExecuteTakeFirst,
    executeTakeFirstOrThrow: vi.fn(),
  };

  const insertChainable = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    onConflict: vi.fn().mockReturnValue({
      columns: vi.fn().mockReturnValue({
        doUpdateSet: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn(),
        }),
      }),
    }),
    doNothing: vi.fn().mockReturnThis(),
    execute: mockExecute,
    executeTakeFirst: vi.fn(),
    executeTakeFirstOrThrow: vi.fn(),
  };

  const deleteChainable = {
    where: vi.fn().mockReturnThis(),
    execute: mockExecute,
    executeTakeFirst: vi.fn(),
  };

  const mockDb = {
    selectFrom: vi.fn().mockReturnValue(chainable),
    insertInto: vi.fn().mockReturnValue(insertChainable),
    deleteFrom: vi.fn().mockReturnValue(deleteChainable),
  };

  return {
    mockDb: mockDb as unknown as Kysely<Database>,
    chainable,
    insertChainable,
    deleteChainable,
    mockExecuteTakeFirst,
    mockExecute,
  };
}

describe('PostgresRbacRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: PostgresRbacRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new PostgresRbacRepository(mockDb.mockDb);
  });

  describe('getUserWithRoles', () => {
    it('should return user with global role and module roles', async () => {
      // Setup: user has global role 'admin' and module role 'treasurer' for treasury
      mockDb.mockExecuteTakeFirst
        .mockResolvedValueOnce({
          id: 'global-role-id',
          user_id: 'user-123',
          organisation_id: 'org-456',
          role: 'admin',
          granted_by: 'owner-user',
          created_at: new Date(),
        });

      mockDb.mockExecute.mockResolvedValueOnce([
        {
          module_name: 'treasury',
          role_name: 'treasurer',
          resource_scope: { vault_ids: ['vault-1', 'vault-2'] },
        },
      ]);

      const result = await repository.getUserWithRoles('user-123', 'org-456');

      expect(result).toEqual({
        userId: 'user-123',
        organisationId: 'org-456',
        globalRole: 'admin',
        moduleRoles: [
          {
            module: 'treasury',
            role: 'treasurer',
            resourceScope: { vault_ids: ['vault-1', 'vault-2'] },
          },
        ],
      });

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('user_global_roles');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('user_id', '=', 'user-123');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('organisation_id', '=', 'org-456');
    });

    it('should return null global role if user has no global role', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValueOnce(undefined);
      mockDb.mockExecute.mockResolvedValueOnce([]);

      const result = await repository.getUserWithRoles('user-123', 'org-456');

      expect(result).toEqual({
        userId: 'user-123',
        organisationId: 'org-456',
        globalRole: null,
        moduleRoles: [],
      });
    });

    it('should return user with only module roles when no global role', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValueOnce(undefined);
      mockDb.mockExecute.mockResolvedValueOnce([
        {
          module_name: 'compliance',
          role_name: 'auditor',
          resource_scope: null,
        },
      ]);

      const result = await repository.getUserWithRoles('user-123', 'org-456');

      expect(result).toEqual({
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
      });
    });
  });

  describe('getModuleRolePermissions', () => {
    it('should return action names for a module role', async () => {
      mockDb.mockExecute.mockResolvedValueOnce([
        { action_name: 'view_balances' },
        { action_name: 'initiate_transfer' },
        { action_name: 'view_transactions' },
      ]);

      const result = await repository.getModuleRolePermissions('treasury', 'treasurer');

      expect(result).toEqual(['view_balances', 'initiate_transfer', 'view_transactions']);
      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('module_role_permissions');
    });

    it('should return empty array for role with no permissions', async () => {
      mockDb.mockExecute.mockResolvedValueOnce([]);

      const result = await repository.getModuleRolePermissions('treasury', 'nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getAllRolePermissions', () => {
    it('should return a map of role keys to action arrays', async () => {
      mockDb.mockExecute.mockResolvedValueOnce([
        { module_name: 'treasury', role_name: 'admin', action_name: 'view_balances' },
        { module_name: 'treasury', role_name: 'admin', action_name: 'initiate_transfer' },
        { module_name: 'treasury', role_name: 'treasurer', action_name: 'view_balances' },
        { module_name: 'compliance', role_name: 'auditor', action_name: 'view_audit_logs' },
      ]);

      const result = await repository.getAllRolePermissions();

      expect(result.get('treasury:admin')).toEqual(['view_balances', 'initiate_transfer']);
      expect(result.get('treasury:treasurer')).toEqual(['view_balances']);
      expect(result.get('compliance:auditor')).toEqual(['view_audit_logs']);
    });

    it('should return empty map when no permissions exist', async () => {
      mockDb.mockExecute.mockResolvedValueOnce([]);

      const result = await repository.getAllRolePermissions();

      expect(result.size).toBe(0);
    });
  });

  describe('findModuleByName', () => {
    it('should return module when found and active', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValueOnce({
        id: 'module-uuid-123',
        name: 'treasury',
      });

      const result = await repository.findModuleByName('treasury');

      expect(result).toEqual({ id: 'module-uuid-123', name: 'treasury' });
      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('modules');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('name', '=', 'treasury');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('is_active', '=', true);
    });

    it('should return null when module not found', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValueOnce(undefined);

      const result = await repository.findModuleByName('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findModuleRoleByName', () => {
    it('should return module role when found', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValueOnce({
        id: 'role-uuid-123',
        name: 'treasurer',
      });

      const result = await repository.findModuleRoleByName('module-uuid-123', 'treasurer');

      expect(result).toEqual({ id: 'role-uuid-123', name: 'treasurer' });
      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('module_roles');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('module_id', '=', 'module-uuid-123');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('name', '=', 'treasurer');
    });

    it('should return null when module role not found', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValueOnce(undefined);

      const result = await repository.findModuleRoleByName('module-uuid-123', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('assignGlobalRole', () => {
    it('should insert or update global role for user', async () => {
      mockDb.insertChainable.executeTakeFirst.mockResolvedValueOnce({ numInsertedOrUpdatedRows: 1n });

      await repository.assignGlobalRole('user-123', 'org-456', 'admin', 'granter-789');

      expect(mockDb.mockDb.insertInto).toHaveBeenCalledWith('user_global_roles');
      expect(mockDb.insertChainable.values).toHaveBeenCalledWith({
        user_id: 'user-123',
        organisation_id: 'org-456',
        role: 'admin',
        granted_by: 'granter-789',
      });
    });
  });

  describe('removeGlobalRole', () => {
    it('should return true when role was removed', async () => {
      mockDb.deleteChainable.executeTakeFirst.mockResolvedValueOnce({ numDeletedRows: 1n });

      const result = await repository.removeGlobalRole('user-123', 'org-456');

      expect(result).toBe(true);
      expect(mockDb.mockDb.deleteFrom).toHaveBeenCalledWith('user_global_roles');
    });

    it('should return false when no role existed', async () => {
      mockDb.deleteChainable.executeTakeFirst.mockResolvedValueOnce({ numDeletedRows: 0n });

      const result = await repository.removeGlobalRole('user-123', 'org-456');

      expect(result).toBe(false);
    });
  });

  describe('assignModuleRole', () => {
    it('should insert module role assignment', async () => {
      mockDb.insertChainable.executeTakeFirst.mockResolvedValueOnce({ numInsertedOrUpdatedRows: 1n });

      await repository.assignModuleRole({
        userId: 'user-123',
        organisationId: 'org-456',
        moduleId: 'module-uuid',
        moduleRoleId: 'role-uuid',
        resourceScope: { vault_ids: ['vault-1'] },
        grantedBy: 'granter-789',
      });

      expect(mockDb.mockDb.insertInto).toHaveBeenCalledWith('user_module_roles');
      expect(mockDb.insertChainable.values).toHaveBeenCalledWith({
        user_id: 'user-123',
        organisation_id: 'org-456',
        module_id: 'module-uuid',
        module_role_id: 'role-uuid',
        resource_scope: JSON.stringify({ vault_ids: ['vault-1'] }),
        granted_by: 'granter-789',
      });
    });

    it('should handle null resource scope', async () => {
      mockDb.insertChainable.executeTakeFirst.mockResolvedValueOnce({ numInsertedOrUpdatedRows: 1n });

      await repository.assignModuleRole({
        userId: 'user-123',
        organisationId: 'org-456',
        moduleId: 'module-uuid',
        moduleRoleId: 'role-uuid',
        resourceScope: null,
        grantedBy: 'granter-789',
      });

      expect(mockDb.insertChainable.values).toHaveBeenCalledWith({
        user_id: 'user-123',
        organisation_id: 'org-456',
        module_id: 'module-uuid',
        module_role_id: 'role-uuid',
        resource_scope: null,
        granted_by: 'granter-789',
      });
    });
  });

  describe('removeModuleRole', () => {
    it('should return true when role was removed', async () => {
      mockDb.deleteChainable.executeTakeFirst.mockResolvedValueOnce({ numDeletedRows: 1n });

      const result = await repository.removeModuleRole('user-123', 'org-456', 'module-uuid');

      expect(result).toBe(true);
      expect(mockDb.mockDb.deleteFrom).toHaveBeenCalledWith('user_module_roles');
    });

    it('should return false when no role existed', async () => {
      mockDb.deleteChainable.executeTakeFirst.mockResolvedValueOnce({ numDeletedRows: 0n });

      const result = await repository.removeModuleRole('user-123', 'org-456', 'module-uuid');

      expect(result).toBe(false);
    });
  });

  describe('listModules', () => {
    it('should return all active modules', async () => {
      mockDb.mockExecute.mockResolvedValueOnce([
        { id: 'module-1', name: 'treasury', display_name: 'Treasury', is_active: true },
        { id: 'module-2', name: 'compliance', display_name: 'Compliance', is_active: true },
      ]);

      const result = await repository.listModules();

      expect(result).toEqual([
        { id: 'module-1', name: 'treasury', displayName: 'Treasury', isActive: true },
        { id: 'module-2', name: 'compliance', displayName: 'Compliance', isActive: true },
      ]);
      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('modules');
    });
  });

  describe('listModuleRoles', () => {
    it('should return roles for a module', async () => {
      mockDb.mockExecute.mockResolvedValueOnce([
        { id: 'role-1', name: 'admin', display_name: 'Admin' },
        { id: 'role-2', name: 'treasurer', display_name: 'Treasurer' },
      ]);

      const result = await repository.listModuleRoles('module-uuid');

      expect(result).toEqual([
        { id: 'role-1', name: 'admin', displayName: 'Admin' },
        { id: 'role-2', name: 'treasurer', displayName: 'Treasurer' },
      ]);
      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('module_roles');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('module_id', '=', 'module-uuid');
    });
  });

  describe('listModuleActions', () => {
    it('should return actions for a module', async () => {
      mockDb.mockExecute.mockResolvedValueOnce([
        { id: 'action-1', name: 'view_balances', display_name: 'View Balances' },
        { id: 'action-2', name: 'initiate_transfer', display_name: 'Initiate Transfer' },
      ]);

      const result = await repository.listModuleActions('module-uuid');

      expect(result).toEqual([
        { id: 'action-1', name: 'view_balances', displayName: 'View Balances' },
        { id: 'action-2', name: 'initiate_transfer', displayName: 'Initiate Transfer' },
      ]);
      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('module_actions');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('module_id', '=', 'module-uuid');
    });
  });
});
