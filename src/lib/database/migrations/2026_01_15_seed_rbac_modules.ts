import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // ============================================================================
  // 1. SEED MODULES
  // ============================================================================

  // Insert Treasury module
  const treasuryResult = await sql<{ id: string }>`
    INSERT INTO modules (name, display_name, description)
    VALUES ('treasury', 'Treasury', 'Treasury management including vaults, transfers, and balances')
    RETURNING id
  `.execute(db);
  const treasuryModuleId = treasuryResult.rows[0]!.id;

  // Insert Compliance module
  const complianceResult = await sql<{ id: string }>`
    INSERT INTO modules (name, display_name, description)
    VALUES ('compliance', 'Compliance', 'Compliance management including audit logs, policies, and reports')
    RETURNING id
  `.execute(db);
  const complianceModuleId = complianceResult.rows[0]!.id;

  // ============================================================================
  // 2. SEED TREASURY ACTIONS
  // ============================================================================

  const treasuryActions = [
    { name: 'view_balances', displayName: 'View Balances', description: 'View wallet and vault balances' },
    { name: 'view_transactions', displayName: 'View Transactions', description: 'View transaction history' },
    { name: 'initiate_transfer', displayName: 'Initiate Transfer', description: 'Create new transfer requests' },
    { name: 'approve_transfer', displayName: 'Approve Transfer', description: 'Approve pending transfer requests' },
    { name: 'cancel_transfer', displayName: 'Cancel Transfer', description: 'Cancel pending transfer requests' },
    { name: 'manage_vaults', displayName: 'Manage Vaults', description: 'Create and configure vaults' },
    { name: 'manage_allowlists', displayName: 'Manage Allowlists', description: 'Manage address allowlists' },
    { name: 'export_data', displayName: 'Export Data', description: 'Export treasury data and reports' },
  ];

  const treasuryActionIds: Record<string, string> = {};

  for (const action of treasuryActions) {
    const result = await sql<{ id: string }>`
      INSERT INTO module_actions (module_id, name, display_name, description)
      VALUES (${treasuryModuleId}::uuid, ${action.name}, ${action.displayName}, ${action.description})
      RETURNING id
    `.execute(db);
    treasuryActionIds[action.name] = result.rows[0]!.id;
  }

  // ============================================================================
  // 3. SEED COMPLIANCE ACTIONS
  // ============================================================================

  const complianceActions = [
    { name: 'view_audit_logs', displayName: 'View Audit Logs', description: 'View system audit logs' },
    { name: 'view_policies', displayName: 'View Policies', description: 'View compliance policies' },
    { name: 'manage_policies', displayName: 'Manage Policies', description: 'Create and modify compliance policies' },
    { name: 'view_reports', displayName: 'View Reports', description: 'View compliance reports' },
    { name: 'export_audit_data', displayName: 'Export Audit Data', description: 'Export audit logs and compliance data' },
    { name: 'manage_sanctions', displayName: 'Manage Sanctions', description: 'Manage sanctions lists and screening' },
    { name: 'replay_decisions', displayName: 'Replay Decisions', description: 'Replay and analyze past policy decisions' },
    { name: 'approve_transfer', displayName: 'Approve Transfer', description: 'Approve transfers from compliance perspective' },
  ];

  const complianceActionIds: Record<string, string> = {};

  for (const action of complianceActions) {
    const result = await sql<{ id: string }>`
      INSERT INTO module_actions (module_id, name, display_name, description)
      VALUES (${complianceModuleId}::uuid, ${action.name}, ${action.displayName}, ${action.description})
      RETURNING id
    `.execute(db);
    complianceActionIds[action.name] = result.rows[0]!.id;
  }

  // ============================================================================
  // 4. SEED TREASURY ROLES
  // ============================================================================

  const treasuryRoles = [
    { name: 'admin', displayName: 'Admin', description: 'Full access to all treasury functions' },
    { name: 'treasurer', displayName: 'Treasurer', description: 'Can view and initiate transfers, but cannot approve' },
    { name: 'auditor', displayName: 'Auditor', description: 'Read-only access to treasury data' },
  ];

  const treasuryRoleIds: Record<string, string> = {};

  for (const role of treasuryRoles) {
    const result = await sql<{ id: string }>`
      INSERT INTO module_roles (module_id, name, display_name, description)
      VALUES (${treasuryModuleId}::uuid, ${role.name}, ${role.displayName}, ${role.description})
      RETURNING id
    `.execute(db);
    treasuryRoleIds[role.name] = result.rows[0]!.id;
  }

  // ============================================================================
  // 5. SEED COMPLIANCE ROLES
  // ============================================================================

  const complianceRoles = [
    { name: 'admin', displayName: 'Admin', description: 'Full access to all compliance functions' },
    { name: 'treasurer', displayName: 'Treasurer', description: 'Limited compliance access for treasury operations' },
    { name: 'auditor', displayName: 'Auditor', description: 'Read access to audit logs and reports' },
  ];

  const complianceRoleIds: Record<string, string> = {};

  for (const role of complianceRoles) {
    const result = await sql<{ id: string }>`
      INSERT INTO module_roles (module_id, name, display_name, description)
      VALUES (${complianceModuleId}::uuid, ${role.name}, ${role.displayName}, ${role.description})
      RETURNING id
    `.execute(db);
    complianceRoleIds[role.name] = result.rows[0]!.id;
  }

  // ============================================================================
  // 6. SEED TREASURY ROLE PERMISSIONS
  // ============================================================================

  // Treasury Admin: ALL actions
  const treasuryAdminActions = Object.keys(treasuryActionIds);
  for (const actionName of treasuryAdminActions) {
    await sql`
      INSERT INTO module_role_permissions (module_role_id, action_id)
      VALUES (${treasuryRoleIds.admin}::uuid, ${treasuryActionIds[actionName]}::uuid)
    `.execute(db);
  }

  // Treasury Treasurer: view_balances, view_transactions, initiate_transfer, cancel_transfer, export_data
  const treasurerActions = ['view_balances', 'view_transactions', 'initiate_transfer', 'cancel_transfer', 'export_data'];
  for (const actionName of treasurerActions) {
    await sql`
      INSERT INTO module_role_permissions (module_role_id, action_id)
      VALUES (${treasuryRoleIds.treasurer}::uuid, ${treasuryActionIds[actionName]}::uuid)
    `.execute(db);
  }

  // Treasury Auditor: view_balances, view_transactions, export_data
  const treasuryAuditorActions = ['view_balances', 'view_transactions', 'export_data'];
  for (const actionName of treasuryAuditorActions) {
    await sql`
      INSERT INTO module_role_permissions (module_role_id, action_id)
      VALUES (${treasuryRoleIds.auditor}::uuid, ${treasuryActionIds[actionName]}::uuid)
    `.execute(db);
  }

  // ============================================================================
  // 7. SEED COMPLIANCE ROLE PERMISSIONS
  // ============================================================================

  // Compliance Admin: ALL actions
  const complianceAdminActions = Object.keys(complianceActionIds);
  for (const actionName of complianceAdminActions) {
    await sql`
      INSERT INTO module_role_permissions (module_role_id, action_id)
      VALUES (${complianceRoleIds.admin}::uuid, ${complianceActionIds[actionName]}::uuid)
    `.execute(db);
  }

  // Compliance Treasurer: view_policies, view_reports
  const complianceTreasurerActions = ['view_policies', 'view_reports'];
  for (const actionName of complianceTreasurerActions) {
    await sql`
      INSERT INTO module_role_permissions (module_role_id, action_id)
      VALUES (${complianceRoleIds.treasurer}::uuid, ${complianceActionIds[actionName]}::uuid)
    `.execute(db);
  }

  // Compliance Auditor: view_audit_logs, view_policies, view_reports, export_audit_data, replay_decisions
  const complianceAuditorActions = ['view_audit_logs', 'view_policies', 'view_reports', 'export_audit_data', 'replay_decisions'];
  for (const actionName of complianceAuditorActions) {
    await sql`
      INSERT INTO module_role_permissions (module_role_id, action_id)
      VALUES (${complianceRoleIds.auditor}::uuid, ${complianceActionIds[actionName]}::uuid)
    `.execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Deleting modules will cascade to module_actions, module_roles, and module_role_permissions
  await sql`DELETE FROM modules WHERE name IN ('treasury', 'compliance')`.execute(db);
}
