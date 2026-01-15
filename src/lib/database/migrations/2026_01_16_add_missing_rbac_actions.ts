import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Migration to add missing RBAC actions and update role permissions.
 *
 * This migration is idempotent - it uses ON CONFLICT DO NOTHING for inserts
 * so it can be safely run on databases that already have the new actions.
 *
 * New actions added:
 * - view_vaults: View vault details and list
 * - create_vault: Create new vaults
 * - view_addresses: View address details and list
 * - create_address: Generate or create new addresses
 * - review_transfer: Review pending transfer requests
 *
 * Role permission updates:
 * - Treasurer: Added view_vaults, view_addresses
 * - Auditor: Added view_vaults, view_addresses
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // Get treasury module ID
  const treasuryModule = await sql<{ id: string }>`
    SELECT id FROM modules WHERE name = 'treasury'
  `.execute(db);

  if (!treasuryModule.rows[0]) {
    // Treasury module doesn't exist, skip migration
    return;
  }

  const moduleId = treasuryModule.rows[0].id;

  // ============================================================================
  // 1. ADD MISSING ACTIONS (idempotent)
  // ============================================================================

  const missingActions = [
    { name: 'view_vaults', displayName: 'View Vaults', description: 'View vault details and list' },
    { name: 'create_vault', displayName: 'Create Vault', description: 'Create new vaults' },
    { name: 'view_addresses', displayName: 'View Addresses', description: 'View address details and list' },
    { name: 'create_address', displayName: 'Create Address', description: 'Generate or create new addresses' },
    { name: 'review_transfer', displayName: 'Review Transfer', description: 'Review pending transfer requests' },
  ];

  for (const action of missingActions) {
    await sql`
      INSERT INTO module_actions (module_id, name, display_name, description)
      VALUES (${moduleId}::uuid, ${action.name}, ${action.displayName}, ${action.description})
      ON CONFLICT (module_id, name) DO NOTHING
    `.execute(db);
  }

  // ============================================================================
  // 2. GET ACTION IDS FOR PERMISSION UPDATES
  // ============================================================================

  const actionsResult = await sql<{ id: string; name: string }>`
    SELECT id, name FROM module_actions WHERE module_id = ${moduleId}::uuid
  `.execute(db);

  const actionIds: Record<string, string> = {};
  for (const action of actionsResult.rows) {
    actionIds[action.name] = action.id;
  }

  // ============================================================================
  // 3. GET ROLE IDS
  // ============================================================================

  const rolesResult = await sql<{ id: string; name: string }>`
    SELECT id, name FROM module_roles WHERE module_id = ${moduleId}::uuid
  `.execute(db);

  const roleIds: Record<string, string> = {};
  for (const role of rolesResult.rows) {
    roleIds[role.name] = role.id;
  }

  // ============================================================================
  // 4. ADD MISSING PERMISSIONS TO ADMIN ROLE (all new actions)
  // ============================================================================

  if (roleIds.admin) {
    const adminNewActions = ['view_vaults', 'create_vault', 'view_addresses', 'create_address', 'review_transfer'];
    for (const actionName of adminNewActions) {
      if (actionIds[actionName]) {
        await sql`
          INSERT INTO module_role_permissions (module_role_id, action_id)
          VALUES (${roleIds.admin}::uuid, ${actionIds[actionName]}::uuid)
          ON CONFLICT (module_role_id, action_id) DO NOTHING
        `.execute(db);
      }
    }
  }

  // ============================================================================
  // 5. ADD MISSING PERMISSIONS TO TREASURER ROLE
  // ============================================================================

  if (roleIds.treasurer) {
    const treasurerNewActions = ['view_vaults', 'view_addresses'];
    for (const actionName of treasurerNewActions) {
      if (actionIds[actionName]) {
        await sql`
          INSERT INTO module_role_permissions (module_role_id, action_id)
          VALUES (${roleIds.treasurer}::uuid, ${actionIds[actionName]}::uuid)
          ON CONFLICT (module_role_id, action_id) DO NOTHING
        `.execute(db);
      }
    }
  }

  // ============================================================================
  // 6. ADD MISSING PERMISSIONS TO AUDITOR ROLE
  // ============================================================================

  if (roleIds.auditor) {
    const auditorNewActions = ['view_vaults', 'view_addresses'];
    for (const actionName of auditorNewActions) {
      if (actionIds[actionName]) {
        await sql`
          INSERT INTO module_role_permissions (module_role_id, action_id)
          VALUES (${roleIds.auditor}::uuid, ${actionIds[actionName]}::uuid)
          ON CONFLICT (module_role_id, action_id) DO NOTHING
        `.execute(db);
      }
    }
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Get treasury module ID
  const treasuryModule = await sql<{ id: string }>`
    SELECT id FROM modules WHERE name = 'treasury'
  `.execute(db);

  if (!treasuryModule.rows[0]) {
    return;
  }

  const moduleId = treasuryModule.rows[0].id;

  // Remove the new actions (cascade will remove permissions)
  const actionsToRemove = ['view_vaults', 'create_vault', 'view_addresses', 'create_address', 'review_transfer'];
  for (const actionName of actionsToRemove) {
    await sql`
      DELETE FROM module_actions
      WHERE module_id = ${moduleId}::uuid AND name = ${actionName}
    `.execute(db);
  }
}
