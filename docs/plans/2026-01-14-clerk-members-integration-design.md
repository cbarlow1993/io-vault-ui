# Clerk Members Integration Design

Connect the Member List page (`/settings/members`) to real Clerk organization data, replacing the current mock data implementation.

## Overview

The current implementation uses hardcoded mock data from `settings.ts`. This design integrates with Clerk's Organization Members API to fetch real member data and perform actual member management operations.

## Data Mapping

### Member Type Mapping

| App Field | Clerk Source | Notes |
|-----------|--------------|-------|
| `id` | `membership.publicUserData.userId` | Clerk user ID |
| `name` | `membership.publicUserData.firstName + lastName` | Or email prefix for pending |
| `email` | `membership.publicUserData.identifier` | Email address |
| `avatarUrl` | `membership.publicUserData.imageUrl` | Profile image |
| `platformRole` | `membership.role` | Mapped from Clerk role key |
| `status` | Derived | `active` from memberships, `pending` from invitations |
| `joinedAt` | `membership.createdAt` | ISO date string |
| `workspaceIds` | N/A | Not tracked in Clerk - field removed or empty |

### Role Mapping (Clerk Custom Roles)

Custom roles must be created in the Clerk Dashboard:

| Clerk Role Key | Display Name | App `PlatformRoleId` |
|----------------|--------------|----------------------|
| `org:owner` | Owner | `owner` |
| `org:admin` | Admin | `admin` |
| `org:billing` | Billing | `billing` |
| `org:member` | Member | `member` |
| `org:auditor` | Auditor | `auditor` |

### Status Model

| Status | Source | Available Actions |
|--------|--------|-------------------|
| `active` | `memberships.data[]` | Change Role, Remove from Org |
| `pending` | `invitations.data[]` | Resend Invite, Revoke Invite |

**Note:** No `deactivated` status. Members are either active or removed entirely.

## Implementation

### Data Fetching

Use Clerk's `useOrganization()` hook:

```tsx
const { organization, memberships, invitations } = useOrganization({
  memberships: { infinite: true },
  invitations: { status: ['pending'] },
});
```

### Mapping Functions

```tsx
// Map Clerk role key to app PlatformRoleId
function mapClerkRole(clerkRole: string): PlatformRoleId {
  const roleMap: Record<string, PlatformRoleId> = {
    'org:owner': 'owner',
    'org:admin': 'admin',
    'org:billing': 'billing',
    'org:member': 'member',
    'org:auditor': 'auditor',
  };
  return roleMap[clerkRole] ?? 'member';
}

// Map app PlatformRoleId to Clerk role key
function toClerkRole(platformRole: PlatformRoleId): string {
  return `org:${platformRole}`;
}

// Map Clerk membership to app Member type
function mapMembership(membership: OrganizationMembershipResource): Member {
  return {
    id: membership.publicUserData?.userId ?? membership.id,
    name: [
      membership.publicUserData?.firstName,
      membership.publicUserData?.lastName,
    ].filter(Boolean).join(' ') || membership.publicUserData?.identifier?.split('@')[0] || 'Unknown',
    email: membership.publicUserData?.identifier ?? '',
    avatarUrl: membership.publicUserData?.imageUrl,
    platformRole: mapClerkRole(membership.role),
    status: 'active',
    joinedAt: membership.createdAt?.toISOString().split('T')[0] ?? '',
    workspaceIds: [],
  };
}

// Map Clerk invitation to app Member type
function mapInvitation(invitation: OrganizationInvitationResource): Member {
  return {
    id: invitation.id,
    name: invitation.emailAddress.split('@')[0],
    email: invitation.emailAddress,
    platformRole: mapClerkRole(invitation.role),
    status: 'pending',
    joinedAt: invitation.createdAt?.toISOString().split('T')[0] ?? '',
    workspaceIds: [],
  };
}
```

### Actions

| Action | Clerk Method | Implementation |
|--------|--------------|----------------|
| Invite Member | `organization.inviteMember()` | `organization.inviteMember({ emailAddress, role: toClerkRole(role) })` |
| Change Role | `membership.update()` | `membership.update({ role: toClerkRole(newRole) })` |
| Remove Member | `membership.destroy()` | `membership.destroy()` |
| Resend Invite | `invitation.resend()` | Revoke and re-invite (Clerk doesn't have resend) |
| Revoke Invite | `invitation.revoke()` | `invitation.revoke()` |

### Error Handling

All mutations wrapped in try/catch with toast notifications:

```tsx
const handleInvite = async (emails: string[], role: PlatformRoleId) => {
  if (!organization) return;

  try {
    for (const email of emails) {
      await organization.inviteMember({
        emailAddress: email,
        role: toClerkRole(role),
      });
    }
    toast.success(`Invited ${emails.length} member(s)`);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to invite member');
  }
};
```

## Files to Modify

### 1. `src/features/settings/data/settings.ts`

- Update `MemberStatus` type: `'active' | 'pending'` (remove `'deactivated'`)
- Remove mock `members` array
- Keep `Member` type, `PlatformRoleId`, `platformRoles` for typing

### 2. `src/features/settings/page-settings-members.tsx`

- Import and use `useOrganization()` from `@clerk/tanstack-react-start`
- Replace `members` import with derived data from Clerk hooks
- Implement real mutation handlers
- Update filter options (remove deactivated status)
- Update stats display (active + pending only)

### 3. New: `src/features/settings/lib/clerk-members.ts`

- `mapClerkRole()` - Clerk role to PlatformRoleId
- `toClerkRole()` - PlatformRoleId to Clerk role
- `mapMembership()` - Clerk membership to Member
- `mapInvitation()` - Clerk invitation to Member

## Clerk Dashboard Setup

Before implementation, create these custom roles in Clerk Dashboard:

1. Go to Clerk Dashboard > Organizations > Roles
2. Create custom roles:
   - `owner` - Full organization access including deletion
   - `admin` - Manage members, teams, and organization settings
   - `billing` - Manage billing, subscriptions, and payments
   - `member` - Standard member with workspace access
   - `auditor` - Read-only access for compliance and audit

## UI Changes

### Removed Features
- Deactivate/Reactivate actions (replaced with Remove)
- Deactivated status filter option
- Deactivated count in stats

### Updated Features
- Stats now show: `X active • Y pending`
- Action menu for active members: Change Role, Remove from Org
- Action menu for pending: Resend Invite, Revoke Invite

## Testing Considerations

- Test with empty organization (no members except owner)
- Test invite flow with valid/invalid emails
- Test role changes (ensure owner protection)
- Test removal (ensure can't remove self or last owner)
- Test pending invitation actions
