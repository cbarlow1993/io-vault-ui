import {
  type Organization as ClerkBackendOrganization,
  type User as ClerkBackendUser,
} from '@clerk/backend';
import {
  useAuth,
  useOrganization,
  useOrganizationList,
  useUser,
} from '@clerk/tanstack-react-start';
import {
  auth as clerkAuth,
  clerkClient,
} from '@clerk/tanstack-react-start/server';

import type {
  AuthProvider,
  AuthResponse,
  AuthSessionData,
  AuthUser,
  Organization,
  SignInCredentials,
  SignUpData,
  UseSessionResult,
} from './types';

/**
 * Maps Clerk user to our unified AuthUser type.
 */
function mapClerkUser(user: ClerkBackendUser): AuthUser {
  const email =
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses[0]?.emailAddress ||
    '';
  const emailVerified =
    user.emailAddresses.some((e) => e.verification?.status === 'verified') ??
    false;

  return {
    id: user.id,
    email,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
    image: user.imageUrl,
    emailVerified,
    role: (user.publicMetadata?.role as 'user' | 'admin') || 'user',
    organizationId: (user.publicMetadata?.organizationId as string) || null,
    organizationRole: (user.publicMetadata?.organizationRole as string) || null,
    onboardedAt: user.publicMetadata?.onboardedAt
      ? new Date(user.publicMetadata.onboardedAt as string)
      : null,
    metadata: user.publicMetadata as Record<string, unknown>,
  };
}

/**
 * Maps Clerk organization to our unified Organization type.
 */
function mapClerkOrganization(
  org:
    | ClerkBackendOrganization
    | {
        id: string;
        name: string;
        slug: string | null;
        imageUrl?: string;
        publicMetadata?: Record<string, unknown> | null;
      }
): Organization {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug || org.id,
    logo: org.imageUrl,
    metadata: org.publicMetadata as Record<string, unknown> | undefined,
  };
}

/**
 * Clerk provider implementation.
 * This provider is used for SaaS deployments where Clerk handles authentication.
 */
export function createClerkProvider(): AuthProvider {
  return {
    name: 'clerk',
    supportsOrganizations: true,

    // ========== Server-side methods ==========

    async getSession(_request: Request): Promise<AuthSessionData | null> {
      try {
        // Use Clerk's auth() helper which is set up by clerkMiddleware
        // This reads auth state from the request context set by the middleware
        const authState = await clerkAuth();

        if (!authState?.userId) {
          return null;
        }

        // Get the user details
        const user = await clerkClient().users.getUser(authState.userId);

        return {
          user: mapClerkUser(user),
          session: {
            id: authState.sessionId || '',
            userId: authState.userId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Clerk manages expiration
          },
        };
      } catch {
        return null;
      }
    },

    async signOut(): Promise<void> {
      // Clerk handles sign out through their client-side SDK
      // Server-side sign out is handled by invalidating the session token
      // This is typically done through the Clerk dashboard or API
    },

    async getUser(userId: string): Promise<AuthUser | null> {
      try {
        const user = await clerkClient().users.getUser(userId);
        return mapClerkUser(user);
      } catch {
        return null;
      }
    },

    async updateUser(
      userId: string,
      data: Partial<AuthUser>
    ): Promise<AuthUser> {
      const updateData: {
        firstName?: string;
        lastName?: string;
        publicMetadata?: Record<string, unknown>;
      } = {};

      if (data.name !== undefined) {
        const nameParts = data.name?.split(' ') || [];
        updateData.firstName = nameParts[0] || '';
        updateData.lastName = nameParts.slice(1).join(' ') || '';
      }

      // Update metadata for role and other custom fields
      const metadata: Record<string, unknown> = {};
      if (data.role !== undefined) metadata.role = data.role;
      if (data.onboardedAt !== undefined)
        metadata.onboardedAt = data.onboardedAt?.toISOString();
      if (data.organizationId !== undefined)
        metadata.organizationId = data.organizationId;
      if (data.organizationRole !== undefined)
        metadata.organizationRole = data.organizationRole;

      if (Object.keys(metadata).length > 0) {
        updateData.publicMetadata = metadata;
      }

      const user = await clerkClient().users.updateUser(userId, updateData);
      return mapClerkUser(user);
    },

    async deleteUser(userId: string): Promise<void> {
      await clerkClient().users.deleteUser(userId);
    },

    // ========== Organization methods ==========

    async getOrganization(orgId: string): Promise<Organization | null> {
      try {
        const org = await clerkClient().organizations.getOrganization({
          organizationId: orgId,
        });
        return mapClerkOrganization(org);
      } catch {
        return null;
      }
    },

    async getUserOrganizations(userId: string): Promise<Organization[]> {
      try {
        const memberships =
          await clerkClient().users.getOrganizationMembershipList({
            userId,
          });

        return memberships.data.map((m) =>
          mapClerkOrganization({
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
            imageUrl: m.organization.imageUrl,
            publicMetadata: m.organization.publicMetadata as Record<
              string,
              unknown
            >,
          })
        );
      } catch {
        return [];
      }
    },

    // ========== Client-side hook ==========

    useSession(): UseSessionResult {
      // Use Clerk's hooks for client-side session management
      const { isLoaded: authLoaded, userId, sessionId } = useAuth();
      const { isLoaded: userLoaded, user } = useUser();
      const { organization } = useOrganization();
      const { userMemberships } = useOrganizationList();

      const isPending = !authLoaded || !userLoaded;

      if (isPending || !userId || !user) {
        return {
          data: null,
          isPending,
          error: null,
          refetch: async () => {},
        };
      }

      // Get the user's role in the current organization
      const currentMembership = userMemberships?.data?.find(
        (m) => m.organization.id === organization?.id
      );

      const sessionData: AuthSessionData = {
        user: {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: user.fullName,
          image: user.imageUrl,
          emailVerified:
            user.emailAddresses.some(
              (e) => e.verification?.status === 'verified'
            ) ?? false,
          role: (user.publicMetadata?.role as 'user' | 'admin') || 'user',
          organizationId: organization?.id || null,
          organizationRole: currentMembership?.role || null,
          onboardedAt: user.publicMetadata?.onboardedAt
            ? new Date(user.publicMetadata.onboardedAt as string)
            : null,
          metadata: user.publicMetadata as Record<string, unknown>,
        },
        session: {
          id: sessionId || '',
          userId: user.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      };

      return {
        data: sessionData,
        isPending: false,
        error: null,
        refetch: async () => {},
      };
    },

    // ========== Auth actions ==========
    // Note: Clerk uses their own UI components for sign-in/sign-up
    // These methods are provided for consistency but redirect to Clerk's hosted pages

    async signInWithCredentials(
      _credentials: SignInCredentials
    ): Promise<AuthResponse<AuthSessionData>> {
      // Clerk handles sign-in through their components
      // This method is not typically used with Clerk
      return {
        error: {
          message: 'Use Clerk components for sign-in',
          code: 'USE_CLERK_COMPONENTS',
        },
      };
    },

    async signUpWithCredentials(
      _data: SignUpData
    ): Promise<AuthResponse<AuthSessionData>> {
      // Clerk handles sign-up through their components
      return {
        error: {
          message: 'Use Clerk components for sign-up',
          code: 'USE_CLERK_COMPONENTS',
        },
      };
    },

    async signInWithSocial(
      _provider: 'google' | 'github',
      _options?: { callbackURL?: string }
    ): Promise<AuthResponse<void>> {
      // Clerk handles social sign-in through their components
      return {
        error: {
          message: 'Use Clerk components for social sign-in',
          code: 'USE_CLERK_COMPONENTS',
        },
      };
    },

    // Clerk doesn't expose these methods - they're handled by their UI
    async requestPasswordReset(_email: string): Promise<AuthResponse<void>> {
      return {
        error: {
          message: 'Use Clerk components for password reset',
          code: 'USE_CLERK_COMPONENTS',
        },
      };
    },

    async resetPassword(
      _token: string,
      _newPassword: string
    ): Promise<AuthResponse<void>> {
      return {
        error: {
          message: 'Use Clerk components for password reset',
          code: 'USE_CLERK_COMPONENTS',
        },
      };
    },

    async sendEmailVerification(_email: string): Promise<AuthResponse<void>> {
      return {
        error: {
          message: 'Use Clerk components for email verification',
          code: 'USE_CLERK_COMPONENTS',
        },
      };
    },

    async verifyEmail(_token: string): Promise<AuthResponse<void>> {
      return {
        error: {
          message: 'Use Clerk components for email verification',
          code: 'USE_CLERK_COMPONENTS',
        },
      };
    },
  };
}
