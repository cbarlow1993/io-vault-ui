# Clerk Members Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect the Member List page to real Clerk organization data, replacing mock data.

**Architecture:** Use Clerk's `useOrganization()` hook to fetch memberships and invitations, map them to the existing `Member` type, and implement real mutations for invite, role change, and removal actions.

**Tech Stack:** Clerk SDK (`@clerk/tanstack-react-start`), React, TypeScript

---

## Prerequisites

Before starting implementation, ensure custom roles are created in Clerk Dashboard:
- `org:owner`, `org:admin`, `org:billing`, `org:member`, `org:auditor`

---

### Task 1: Create Clerk Members Helper Module

**Files:**
- Create: `src/features/settings/lib/clerk-members.ts`

**Step 1: Create the helper file with role mapping functions**

```typescript
import type {
  OrganizationInvitationResource,
  OrganizationMembershipResource,
} from '@clerk/types';

import type { Member, MemberStatus, PlatformRoleId } from '../data/settings';

/**
 * Map Clerk role key to app PlatformRoleId
 */
export function mapClerkRole(clerkRole: string): PlatformRoleId {
  const roleMap: Record<string, PlatformRoleId> = {
    'org:owner': 'owner',
    'org:admin': 'admin',
    'org:billing': 'billing',
    'org:member': 'member',
    'org:auditor': 'auditor',
  };
  return roleMap[clerkRole] ?? 'member';
}

/**
 * Map app PlatformRoleId to Clerk role key
 */
export function toClerkRole(platformRole: PlatformRoleId): string {
  return `org:${platformRole}`;
}

/**
 * Map Clerk membership to app Member type
 */
export function mapMembership(
  membership: OrganizationMembershipResource
): Member {
  const firstName = membership.publicUserData?.firstName ?? '';
  const lastName = membership.publicUserData?.lastName ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const identifier = membership.publicUserData?.identifier ?? '';

  return {
    id: membership.publicUserData?.userId ?? membership.id,
    name: fullName || identifier.split('@')[0] || 'Unknown',
    email: identifier,
    avatarUrl: membership.publicUserData?.imageUrl,
    platformRole: mapClerkRole(membership.role),
    status: 'active' as MemberStatus,
    joinedAt: membership.createdAt
      ? new Date(membership.createdAt).toISOString().split('T')[0]
      : '',
    workspaceIds: [],
  };
}

/**
 * Map Clerk invitation to app Member type
 */
export function mapInvitation(
  invitation: OrganizationInvitationResource
): Member {
  return {
    id: invitation.id,
    name: invitation.emailAddress.split('@')[0],
    email: invitation.emailAddress,
    platformRole: mapClerkRole(invitation.role ?? 'org:member'),
    status: 'pending' as MemberStatus,
    joinedAt: invitation.createdAt
      ? new Date(invitation.createdAt).toISOString().split('T')[0]
      : '',
    workspaceIds: [],
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors related to `clerk-members.ts`

**Step 3: Commit**

```bash
git add src/features/settings/lib/clerk-members.ts
git commit -m "feat(settings): add Clerk members mapping utilities"
```

---

### Task 2: Update Member Types

**Files:**
- Modify: `src/features/settings/data/settings.ts`

**Step 1: Update MemberStatus type and remove mock members array**

Find and replace the `MemberStatus` type (around line 197):

```typescript
// Before
export type MemberStatus = 'active' | 'pending' | 'deactivated';

// After
export type MemberStatus = 'active' | 'pending';
```

**Step 2: Remove the mock `members` array**

Delete the entire `members` array (lines 267-340) and the helper functions that use it:
- Delete `members` array
- Delete `getMemberById` function
- Delete `getMembersByWorkspaceId` function

**Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: Errors in `page-settings-members.tsx` (expected - we'll fix in Task 3)

**Step 4: Commit**

```bash
git add src/features/settings/data/settings.ts
git commit -m "refactor(settings): remove mock members data, simplify MemberStatus type"
```

---

### Task 3: Update Members Page - Imports and Data Fetching

**Files:**
- Modify: `src/features/settings/page-settings-members.tsx`

**Step 1: Update imports**

Replace the current imports at the top of the file:

```typescript
import { useOrganization } from '@clerk/tanstack-react-start';
import {
  ChevronDownIcon,
  MailIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

import { getStatusStyles } from '@/features/shared/lib/status-styles';

import { SettingsLayout } from './components/settings-layout';
import {
  type MemberStatus,
  type PlatformRoleId,
  platformRoles,
} from './data/settings';
import {
  mapInvitation,
  mapMembership,
  toClerkRole,
} from './lib/clerk-members';
```

**Step 2: Add data fetching with useOrganization hook**

At the start of the `PageSettingsMembers` component, add:

```typescript
export const PageSettingsMembers = () => {
  const { organization, memberships, invitations } = useOrganization({
    memberships: {
      infinite: true,
    },
    invitations: {
      infinite: true,
      status: ['pending'],
    },
  });

  // Derive members from Clerk data
  const members = useMemo(() => {
    const activeMembers = (memberships?.data ?? []).map(mapMembership);
    const pendingMembers = (invitations?.data ?? []).map(mapInvitation);
    return [...activeMembers, ...pendingMembers];
  }, [memberships?.data, invitations?.data]);

  const isLoading = !memberships?.data;
```

**Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: Still errors - handler functions need updating (Task 4)

**Step 4: Commit**

```bash
git add src/features/settings/page-settings-members.tsx
git commit -m "feat(settings): integrate Clerk useOrganization for members data"
```

---

### Task 4: Update Members Page - Action Handlers

**Files:**
- Modify: `src/features/settings/page-settings-members.tsx`

**Step 1: Replace action handlers**

Replace all the handler functions with real Clerk API calls:

```typescript
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    const emails = inviteEmails
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      toast.error('Please enter at least one email address');
      return;
    }

    try {
      for (const email of emails) {
        await organization.inviteMember({
          emailAddress: email,
          role: toClerkRole(inviteRole),
        });
      }
      toast.success(
        `Invitation sent to ${emails.length} ${emails.length === 1 ? 'person' : 'people'}`
      );
      setInviteOpen(false);
      setInviteEmails('');
      setInviteRole('member');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to send invitation'
      );
    }
  };

  const handleResendInvite = async (invitationId: string) => {
    if (!organization) return;

    try {
      // Clerk doesn't have a resend - we revoke and re-invite
      const invitation = invitations?.data?.find((inv) => inv.id === invitationId);
      if (!invitation) return;

      await invitation.revoke();
      await organization.inviteMember({
        emailAddress: invitation.emailAddress,
        role: invitation.role ?? 'org:member',
      });
      toast.success('Invitation resent');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to resend invitation'
      );
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    try {
      const invitation = invitations?.data?.find((inv) => inv.id === invitationId);
      if (!invitation) return;

      await invitation.revoke();
      toast.success('Invitation revoked');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to revoke invitation'
      );
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const membership = memberships?.data?.find(
        (m) => m.publicUserData?.userId === memberId || m.id === memberId
      );
      if (!membership) return;

      await membership.destroy();
      toast.success('Member removed from organization');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove member'
      );
    }
  };

  const handleChangeRole = async (memberId: string, newRole: PlatformRoleId) => {
    try {
      const membership = memberships?.data?.find(
        (m) => m.publicUserData?.userId === memberId || m.id === memberId
      );
      if (!membership) return;

      await membership.update({ role: toClerkRole(newRole) });
      toast.success('Role updated');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update role'
      );
    }
  };
```

**Step 2: Remove unused handlers**

Delete these functions (no longer needed):
- `handleDeactivate`
- `handleReactivate`

**Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: Still errors in JSX - needs UI updates (Task 5)

**Step 4: Commit**

```bash
git add src/features/settings/page-settings-members.tsx
git commit -m "feat(settings): implement real Clerk API calls for member actions"
```

---

### Task 5: Update Members Page - UI Updates

**Files:**
- Modify: `src/features/settings/page-settings-members.tsx`

**Step 1: Update status filter to remove 'deactivated'**

Find the status filter dropdown and update it:

```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button
      type="button"
      className="flex h-9 items-center gap-2 border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
    >
      Status: <span className="capitalize">{statusFilter}</span>
      <ChevronDownIcon className="size-3.5" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="rounded-none">
    <DropdownMenuItem
      onClick={() => setStatusFilter('all')}
      className="rounded-none text-xs"
    >
      All
    </DropdownMenuItem>
    <DropdownMenuItem
      onClick={() => setStatusFilter('active')}
      className="rounded-none text-xs"
    >
      Active
    </DropdownMenuItem>
    <DropdownMenuItem
      onClick={() => setStatusFilter('pending')}
      className="rounded-none text-xs"
    >
      Pending
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Step 2: Update action menu in table rows**

Replace the actions cell in the table row with updated logic:

```typescript
<td className="px-4 py-3 text-right">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        className="flex size-7 items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
      >
        <MoreHorizontalIcon className="size-4" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="rounded-none">
      {member.status === 'pending' && (
        <>
          <DropdownMenuItem
            onClick={() => handleResendInvite(member.id)}
            className="rounded-none text-xs"
          >
            <MailIcon className="mr-2 size-3.5" />
            Resend Invite
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleRevokeInvite(member.id)}
            className="rounded-none text-xs text-negative-600"
          >
            <XIcon className="mr-2 size-3.5" />
            Revoke Invite
          </DropdownMenuItem>
        </>
      )}
      {member.status === 'active' && member.platformRole !== 'owner' && (
        <DropdownMenuItem
          onClick={() => handleRemove(member.id)}
          className="rounded-none text-xs text-negative-600"
        >
          <XIcon className="mr-2 size-3.5" />
          Remove from Org
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
</td>
```

**Step 3: Update stats footer**

Replace the stats section at the bottom:

```typescript
{/* Stats */}
<div className="flex items-center gap-4 text-xs text-neutral-500">
  <span>
    {members.filter((m) => m.status === 'active').length} active
  </span>
  <span className="text-neutral-300">•</span>
  <span>
    {members.filter((m) => m.status === 'pending').length} pending
  </span>
</div>
```

**Step 4: Add loading state**

After the filters section, add a loading state:

```typescript
{isLoading ? (
  <div className="flex items-center justify-center py-12">
    <div className="text-sm text-neutral-500">Loading members...</div>
  </div>
) : (
  <>
    {/* Members Table */}
    <div className="border border-neutral-200">
      {/* ... existing table code ... */}
    </div>

    {/* Stats */}
    <div className="flex items-center gap-4 text-xs text-neutral-500">
      {/* ... stats code ... */}
    </div>
  </>
)}
```

**Step 5: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/features/settings/page-settings-members.tsx
git commit -m "feat(settings): update members UI for Clerk integration"
```

---

### Task 6: Remove Workspaces from Invite Dialog

**Files:**
- Modify: `src/features/settings/page-settings-members.tsx`

**Step 1: Remove workspace selection from invite dialog**

Find and remove the workspace selection section in the invite dialog (the entire `<div className="space-y-2">` block with "Add to Workspaces"):

```typescript
// DELETE this entire block from the invite dialog:
<div className="space-y-2">
  <label className="text-xs font-medium text-neutral-700">
    Add to Workspaces{' '}
    <span className="font-normal text-neutral-400">
      (optional)
    </span>
  </label>
  <div className="max-h-32 space-y-1 overflow-y-auto border border-neutral-200 p-2">
    {workspaces
      .filter((ws) => ws.status === 'active')
      .map((workspace) => (
        <label
          key={workspace.id}
          className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-neutral-50"
        >
          <input
            type="checkbox"
            className="rounded border-neutral-300"
          />
          {workspace.name}
        </label>
      ))}
  </div>
</div>
```

Also remove the `workspaces` import from `./data/settings` if no longer used elsewhere in this file.

**Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/settings/page-settings-members.tsx
git commit -m "refactor(settings): remove workspace selection from invite dialog"
```

---

### Task 7: Manual Testing

**Step 1: Start the development server**

Run: `pnpm dev`

**Step 2: Test member list**

1. Navigate to `/settings/members`
2. Verify members list loads from Clerk (shows real organization members)
3. Verify status filter works (All, Active, Pending)
4. Verify role filter works
5. Verify search works

**Step 3: Test invite flow**

1. Click "Invite Member"
2. Enter a test email address
3. Select a role
4. Click "Send Invitations"
5. Verify invitation appears in the pending list
6. Verify invitation appears in Clerk Dashboard

**Step 4: Test role change**

1. Click on a member's role badge (non-owner)
2. Select a different role
3. Verify role updates
4. Verify change reflected in Clerk Dashboard

**Step 5: Test remove member**

1. Click actions menu on a non-owner member
2. Click "Remove from Org"
3. Verify member is removed
4. Verify removal reflected in Clerk Dashboard

**Step 6: Test pending invitation actions**

1. Find a pending invitation
2. Test "Resend Invite" - verify success toast
3. Test "Revoke Invite" - verify invitation removed

---

### Task 8: Final Commit

**Step 1: Verify all changes are committed**

Run: `git status`
Expected: Working tree clean

**Step 2: If any uncommitted changes, commit them**

```bash
git add -A
git commit -m "chore(settings): finalize Clerk members integration"
```

---

## Summary

After completing all tasks:

1. ✅ Helper utilities for mapping Clerk data to Member type
2. ✅ Updated types (removed `deactivated` status)
3. ✅ Members page fetches real data from Clerk
4. ✅ All actions (invite, role change, remove, revoke) use Clerk API
5. ✅ UI updated to reflect simplified status model
6. ✅ Manual testing completed

The mock data has been fully replaced with real Clerk organization data.
