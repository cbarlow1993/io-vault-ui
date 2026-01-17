import { describe, expect, it } from 'vitest';

import {
  mapClerkRole,
  mapInvitation,
  mapMembership,
  toClerkRole,
} from './clerk-members';

describe('clerk-members utilities', () => {
  describe('mapClerkRole', () => {
    it.each([
      ['org:owner', 'owner'],
      ['org:admin', 'admin'],
      ['org:billing', 'billing'],
      ['org:member', 'member'],
      ['org:auditor', 'auditor'],
    ] as const)('should map %s to %s', (clerkRole, expected) => {
      expect(mapClerkRole(clerkRole)).toBe(expected);
    });

    it('should default to member for unknown roles', () => {
      expect(mapClerkRole('org:unknown')).toBe('member');
      expect(mapClerkRole('invalid')).toBe('member');
    });
  });

  describe('toClerkRole', () => {
    it.each([
      ['owner', 'org:owner'],
      ['admin', 'org:admin'],
      ['billing', 'org:billing'],
      ['member', 'org:member'],
      ['auditor', 'org:auditor'],
    ] as const)('should convert %s to %s', (platformRole, expected) => {
      expect(toClerkRole(platformRole)).toBe(expected);
    });
  });

  describe('mapMembership', () => {
    it('should map a full membership', () => {
      const membership = {
        id: 'mem_123',
        role: 'org:admin',
        createdAt: new Date('2024-01-15'),
        publicUserData: {
          userId: 'user_456',
          firstName: 'John',
          lastName: 'Doe',
          identifier: 'john@example.com',
          imageUrl: 'https://example.com/avatar.jpg',
        },
      };

      const result = mapMembership(membership as never);

      expect(result).toEqual({
        id: 'user_456',
        name: 'John Doe',
        email: 'john@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
        platformRole: 'admin',
        status: 'active',
        joinedAt: '2024-01-15',
        workspaceIds: [],
      });
    });

    it('should handle missing first/last name by using email prefix', () => {
      const membership = {
        id: 'mem_123',
        role: 'org:member',
        createdAt: new Date('2024-01-15'),
        publicUserData: {
          userId: 'user_456',
          firstName: '',
          lastName: '',
          identifier: 'john.smith@example.com',
        },
      };

      const result = mapMembership(membership as never);

      expect(result.name).toBe('john.smith');
    });

    it('should handle missing publicUserData', () => {
      const membership = {
        id: 'mem_123',
        role: 'org:member',
        createdAt: new Date('2024-01-15'),
        publicUserData: null,
      };

      const result = mapMembership(membership as never);

      expect(result.id).toBe('mem_123');
      expect(result.name).toBe('Unknown');
      expect(result.email).toBe('');
    });

    it('should handle missing createdAt', () => {
      const membership = {
        id: 'mem_123',
        role: 'org:member',
        createdAt: null,
        publicUserData: {
          userId: 'user_456',
          identifier: 'john@example.com',
        },
      };

      const result = mapMembership(membership as never);

      expect(result.joinedAt).toBe('');
    });
  });

  describe('mapInvitation', () => {
    it('should map a full invitation', () => {
      const invitation = {
        id: 'inv_123',
        emailAddress: 'jane@example.com',
        role: 'org:billing',
        createdAt: new Date('2024-01-20'),
      };

      const result = mapInvitation(invitation as never);

      expect(result).toEqual({
        id: 'inv_123',
        name: 'jane',
        email: 'jane@example.com',
        platformRole: 'billing',
        status: 'pending',
        joinedAt: '2024-01-20',
        workspaceIds: [],
      });
    });

    it('should default to member role when role is missing', () => {
      const invitation = {
        id: 'inv_123',
        emailAddress: 'jane@example.com',
        role: null,
        createdAt: new Date('2024-01-20'),
      };

      const result = mapInvitation(invitation as never);

      expect(result.platformRole).toBe('member');
    });

    it('should handle missing createdAt', () => {
      const invitation = {
        id: 'inv_123',
        emailAddress: 'jane@example.com',
        role: 'org:member',
        createdAt: null,
      };

      const result = mapInvitation(invitation as never);

      expect(result.joinedAt).toBe('');
    });
  });
});
