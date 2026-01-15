/**
 * Core authentication types for the auth abstraction layer.
 * These types provide a unified interface for authentication operations.
 */

/**
 * Unified user representation across all auth providers
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image?: string | null;
  emailVerified: boolean;
  role?: 'user' | 'admin' | null;
  organizationId?: string | null;
  organizationRole?: string | null;
  onboardedAt?: Date | null;
  metadata?: Record<string, unknown>;
}

/**
 * Unified session representation across all auth providers
 */
export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  token?: string;
}

/**
 * Organization representation for multi-tenant support
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Combined session data returned by auth operations
 */
export interface AuthSessionData {
  user: AuthUser;
  session: AuthSession;
}

/**
 * Auth response wrapper for operations that can fail
 */
export interface AuthResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    status?: number;
  };
}

/**
 * Session hook return type for client-side usage
 */
export interface UseSessionResult {
  data: AuthSessionData | null;
  isPending: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Sign-in credentials for email/password auth
 */
export interface SignInCredentials {
  email: string;
  password: string;
}

/**
 * Sign-up data for new user registration
 */
export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

/**
 * Auth provider interface - the contract that all providers must implement.
 * Uses factory functions pattern for creating provider instances.
 */
export interface AuthProvider {
  /**
   * Provider identifier
   */
  readonly name: 'clerk';

  /**
   * Whether this provider supports organizations
   */
  readonly supportsOrganizations: boolean;

  // ========== Server-side methods ==========

  /**
   * Get the current session from request headers (server-side)
   */
  getSession(request: Request): Promise<AuthSessionData | null>;

  /**
   * Sign out the current user (invalidate session)
   */
  signOut(request: Request): Promise<void>;

  /**
   * Get a user by ID
   */
  getUser(userId: string): Promise<AuthUser | null>;

  /**
   * Update a user's profile
   */
  updateUser(userId: string, data: Partial<AuthUser>): Promise<AuthUser>;

  /**
   * Delete a user
   */
  deleteUser(userId: string): Promise<void>;

  // ========== Organization methods ==========

  /**
   * Get an organization by ID
   */
  getOrganization(orgId: string): Promise<Organization | null>;

  /**
   * Get all organizations a user belongs to
   */
  getUserOrganizations(userId: string): Promise<Organization[]>;

  // ========== Client-side hook ==========

  /**
   * React hook for accessing session state (client-side only)
   * This is a function that returns the hook result
   */
  useSession: () => UseSessionResult;

  // ========== Auth actions (used by UI components) ==========

  /**
   * Sign in with email/password
   */
  signInWithCredentials?(
    credentials: SignInCredentials
  ): Promise<AuthResponse<AuthSessionData>>;

  /**
   * Sign up with email/password
   */
  signUpWithCredentials?(
    data: SignUpData
  ): Promise<AuthResponse<AuthSessionData>>;

  /**
   * Sign in with social provider
   */
  signInWithSocial?(
    provider: 'google' | 'github',
    options?: { callbackURL?: string; errorCallbackURL?: string }
  ): Promise<AuthResponse<void>>;

  /**
   * Request password reset email
   */
  requestPasswordReset?(email: string): Promise<AuthResponse<void>>;

  /**
   * Reset password with token
   */
  resetPassword?(
    token: string,
    newPassword: string
  ): Promise<AuthResponse<void>>;

  /**
   * Send email verification
   */
  sendEmailVerification?(email: string): Promise<AuthResponse<void>>;

  /**
   * Verify email with token
   */
  verifyEmail?(token: string): Promise<AuthResponse<void>>;
}

/**
 * Helper type to extract user from session data
 */
export type SessionUser = AuthSessionData['user'];

/**
 * Helper type for auth context in middleware/routes
 */
export interface AuthContext {
  user: AuthUser | null;
  session: AuthSession | null;
}
