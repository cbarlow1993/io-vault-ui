/**
 * Shared status styling utilities
 *
 * Provides consistent styling for status badges across all pages.
 * Uses a single source of truth for status colors to ensure UI consistency.
 */

// =============================================================================
// Status Badge Styles
// =============================================================================

/**
 * Common status types used across the application.
 * Each status maps to a consistent color scheme.
 */
export type CommonStatus =
  | 'active'
  | 'pending'
  | 'revoked'
  | 'expired'
  | 'draft'
  | 'disabled'
  | 'deactivated'
  | 'superseded'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'approved'
  | 'verified'
  | 'paid';

const statusStyleMap: Record<CommonStatus, string> = {
  // Positive states
  active: 'bg-positive-100 text-positive-700',
  completed: 'bg-positive-100 text-positive-700',
  approved: 'bg-positive-100 text-positive-700',
  verified: 'bg-positive-100 text-positive-700',
  paid: 'bg-positive-100 text-positive-700',

  // Warning states
  pending: 'bg-warning-100 text-warning-700',

  // Brand states (work in progress)
  draft: 'bg-brand-100 text-brand-700',

  // Neutral states
  expired: 'bg-neutral-100 text-neutral-500',
  superseded: 'bg-neutral-100 text-neutral-500',
  deactivated: 'bg-neutral-100 text-neutral-500',
  disabled: 'bg-neutral-100 text-neutral-400',

  // Negative states
  revoked: 'bg-negative-100 text-negative-600',
  failed: 'bg-negative-100 text-negative-600',
  rejected: 'bg-negative-100 text-negative-600',
};

/**
 * Get Tailwind classes for a status badge.
 * Returns consistent styling for any status type.
 *
 * @example
 * ```tsx
 * <span className={cn('rounded px-2 py-0.5 text-xs font-medium', getStatusStyles('active'))}>
 *   Active
 * </span>
 * ```
 */
export const getStatusStyles = (status: string): string => {
  return (
    statusStyleMap[status as CommonStatus] ?? 'bg-neutral-100 text-neutral-500'
  );
};

// =============================================================================
// Health Indicator Styles (for signers/devices)
// =============================================================================

export type HealthStatus = 'online' | 'idle' | 'offline' | 'unknown';

const healthStyleMap: Record<HealthStatus, string> = {
  online: 'bg-positive-500',
  idle: 'bg-warning-500',
  offline: 'bg-neutral-400',
  unknown: 'bg-neutral-300',
};

const healthLabelMap: Record<HealthStatus, string> = {
  online: 'Online',
  idle: 'Idle',
  offline: 'Offline',
  unknown: 'Unknown',
};

/**
 * Get Tailwind classes for a health indicator dot.
 *
 * @example
 * ```tsx
 * <span className={cn('size-2 rounded-full', getHealthStyles('online'))} />
 * ```
 */
export const getHealthStyles = (health: HealthStatus): string => {
  return healthStyleMap[health] ?? healthStyleMap.unknown;
};

/**
 * Get display label for a health status.
 */
export const getHealthLabel = (health: HealthStatus): string => {
  return healthLabelMap[health] ?? 'Unknown';
};

// =============================================================================
// Role Styles (for platform roles)
// =============================================================================

export type RoleType = 'owner' | 'admin' | 'member' | 'viewer';

const roleStyleMap: Record<RoleType, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  member: 'bg-neutral-100 text-neutral-600',
  viewer: 'bg-neutral-100 text-neutral-500',
};

/**
 * Get Tailwind classes for a role badge.
 */
export const getRoleStyles = (role: string): string => {
  return roleStyleMap[role as RoleType] ?? 'bg-neutral-100 text-neutral-600';
};

// =============================================================================
// Device Type Labels
// =============================================================================

export type DeviceType = 'ios' | 'android' | 'virtual';

const deviceLabelMap: Record<DeviceType, string> = {
  ios: 'iOS',
  android: 'Android',
  virtual: 'Virtual',
};

/**
 * Get display label for a device type.
 */
export const getDeviceLabel = (deviceType: DeviceType): string => {
  return deviceLabelMap[deviceType] ?? deviceType;
};
