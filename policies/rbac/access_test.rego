# policies/rbac/access_test.rego

package rbac.access_test

import rego.v1

import data.rbac.access

# Test data
role_permissions := {
    "treasury:admin": ["view_balances", "initiate_transfer", "approve_transfer", "manage_vaults"],
    "treasury:treasurer": ["view_balances", "initiate_transfer"],
    "treasury:auditor": ["view_balances"],
}

test_owner_allowed if {
    result := access.decision with input as {
        "user": {"global_role": "owner", "module_roles": []},
        "module": "treasury",
        "action": "manage_vaults",
        "resource": {}
    } with data.role_permissions as role_permissions

    result.allowed == true
    result.matched_role == "owner"
}

test_treasurer_can_view_balances if {
    result := access.decision with input as {
        "user": {
            "global_role": null,
            "module_roles": [{"module": "treasury", "role": "treasurer", "resource_scope": null}]
        },
        "module": "treasury",
        "action": "view_balances",
        "resource": {}
    } with data.role_permissions as role_permissions

    result.allowed == true
}

test_treasurer_cannot_manage_vaults if {
    result := access.decision with input as {
        "user": {
            "global_role": null,
            "module_roles": [{"module": "treasury", "role": "treasurer", "resource_scope": null}]
        },
        "module": "treasury",
        "action": "manage_vaults",
        "resource": {}
    } with data.role_permissions as role_permissions

    result.allowed == false
}

test_no_role_denied if {
    result := access.decision with input as {
        "user": {"global_role": null, "module_roles": []},
        "module": "treasury",
        "action": "view_balances",
        "resource": {}
    } with data.role_permissions as role_permissions

    result.allowed == false
    contains(result.reason, "no role assigned")
}

test_scope_restriction_allowed if {
    result := access.decision with input as {
        "user": {
            "global_role": null,
            "module_roles": [{
                "module": "treasury",
                "role": "treasurer",
                "resource_scope": {"vault_ids": ["vault-1", "vault-2"]}
            }]
        },
        "module": "treasury",
        "action": "view_balances",
        "resource": {"vault_id": "vault-1"}
    } with data.role_permissions as role_permissions

    result.allowed == true
}

test_scope_restriction_denied if {
    result := access.decision with input as {
        "user": {
            "global_role": null,
            "module_roles": [{
                "module": "treasury",
                "role": "treasurer",
                "resource_scope": {"vault_ids": ["vault-1", "vault-2"]}
            }]
        },
        "module": "treasury",
        "action": "view_balances",
        "resource": {"vault_id": "vault-3"}
    } with data.role_permissions as role_permissions

    result.allowed == false
    contains(result.reason, "vault-3")
}

test_admin_can_manage_vaults if {
    result := access.decision with input as {
        "user": {
            "global_role": null,
            "module_roles": [{"module": "treasury", "role": "admin", "resource_scope": null}]
        },
        "module": "treasury",
        "action": "manage_vaults",
        "resource": {}
    } with data.role_permissions as role_permissions

    result.allowed == true
}

# Empty vault_ids array should allow all vaults (no restrictions)
test_empty_vault_ids_allows_all if {
    result := access.decision with input as {
        "user": {
            "global_role": null,
            "module_roles": [{
                "module": "treasury",
                "role": "treasurer",
                "resource_scope": {"vault_ids": []}
            }]
        },
        "module": "treasury",
        "action": "view_balances",
        "resource": {"vault_id": "any-vault"}
    } with data.role_permissions as role_permissions

    result.allowed == true
}
