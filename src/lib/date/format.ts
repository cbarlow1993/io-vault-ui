/**
 * Date formatting utilities for consistent date/time display across the application.
 *
 * All functions accept either a Date object or an ISO date string.
 */

type DateInput = Date | string;

/**
 * Converts input to a Date object.
 * @param input - Date object or ISO string
 * @returns Date object
 */
const toDate = (input: DateInput): Date => {
  return input instanceof Date ? input : new Date(input);
};

/**
 * Format date as short format: "Jan 15, 2024"
 * @param input - Date object or ISO string
 * @returns Formatted date string
 */
export const formatDate = (input: DateInput): string => {
  const date = toDate(input);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format date as long format: "January 15, 2024"
 * @param input - Date object or ISO string
 * @returns Formatted date string
 */
export const formatDateLong = (input: DateInput): string => {
  const date = toDate(input);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format time as "10:30 AM"
 * @param input - Date object or ISO string
 * @returns Formatted time string
 */
export const formatTime = (input: DateInput): string => {
  const date = toDate(input);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format date and time as separate parts plus combined full string.
 * Returns: { date: "Jan 15, 2024", time: "10:30 AM", full: "Jan 15, 2024, 10:30 AM" }
 * @param input - Date object or ISO string
 * @returns Object with date, time, and full formatted strings
 */
export const formatDateTime = (
  input: DateInput
): { date: string; time: string; full: string } => {
  const date = toDate(input);
  return {
    date: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    full: date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

/**
 * Format date and time in long format: "January 15, 2024, 10:30 AM"
 * @param input - Date object or ISO string
 * @returns Formatted date-time string
 */
export const formatDateTimeLong = (input: DateInput): string => {
  const date = toDate(input);
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format date and time in numeric format: "01/15/2024, 10:30 AM"
 * Used for signatures and compact displays.
 * @param input - Date object or ISO string
 * @returns Formatted date-time string
 */
export const formatDateTimeNumeric = (input: DateInput): string => {
  const date = toDate(input);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format relative time from now: "2m ago", "5h ago", "3d ago"
 * Falls back to formatDateTime.full for dates older than 7 days.
 * @param input - Date object or ISO string
 * @returns Relative time string or formatted date for older dates
 */
export const formatRelativeTime = (input: DateInput): string => {
  const date = toDate(input);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDateTime(input).full;
};
