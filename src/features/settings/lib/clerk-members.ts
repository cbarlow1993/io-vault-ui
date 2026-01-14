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
      ? (new Date(membership.createdAt).toISOString().split('T')[0] ?? '')
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
    name: invitation.emailAddress.split('@')[0] ?? invitation.emailAddress,
    email: invitation.emailAddress,
    platformRole: mapClerkRole(invitation.role ?? 'org:member'),
    status: 'pending' as MemberStatus,
    joinedAt: invitation.createdAt
      ? (new Date(invitation.createdAt).toISOString().split('T')[0] ?? '')
      : '',
    workspaceIds: [],
  };
}
