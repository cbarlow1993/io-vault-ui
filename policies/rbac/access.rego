# policies/rbac/access.rego

package rbac.access

import rego.v1

default decision := {"allowed": false, "reason": "no matching policy"}

# Owner bypasses all checks
decision := {"allowed": true, "matched_role": "owner"} if {
    input.user.global_role == "owner"
}

# Check module access for non-owners
decision := result if {
    input.user.global_role != "owner"
    result := check_module_access
}

check_module_access := {"allowed": true, "matched_role": role_key} if {
    some assignment in input.user.module_roles
    assignment.module == input.module

    # Check resource scope
    valid_scope(assignment)

    # Check action permission
    role_key := sprintf("%s:%s", [assignment.module, assignment.role])
    some action in data.role_permissions[role_key]
    action == input.action
}

check_module_access := {"allowed": false, "reason": reason} if {
    not has_module_role
    reason := sprintf("no role assigned for module '%s'", [input.module])
}

check_module_access := {"allowed": false, "reason": reason} if {
    has_module_role
    not has_action_permission
    reason := sprintf("role does not permit action '%s'", [input.action])
}

check_module_access := {"allowed": false, "reason": reason} if {
    has_module_role
    has_action_permission
    not scope_valid
    reason := sprintf("vault '%s' not in authorized scope", [input.resource.vault_id])
}

# Helper for scope validity check
scope_valid if {
    some assignment in input.user.module_roles
    assignment.module == input.module
    valid_scope(assignment)
}

# Scope validation
valid_scope(assignment) if {
    assignment.resource_scope == null
}

valid_scope(assignment) if {
    not assignment.resource_scope.vault_ids
}

valid_scope(assignment) if {
    assignment.resource_scope.vault_ids
    not input.resource.vault_id
}

valid_scope(assignment) if {
    assignment.resource_scope.vault_ids
    input.resource.vault_id in assignment.resource_scope.vault_ids
}

# Helper predicates
has_module_role if {
    some assignment in input.user.module_roles
    assignment.module == input.module
}

has_action_permission if {
    some assignment in input.user.module_roles
    assignment.module == input.module
    role_key := sprintf("%s:%s", [assignment.module, assignment.role])
    some action in data.role_permissions[role_key]
    action == input.action
}
