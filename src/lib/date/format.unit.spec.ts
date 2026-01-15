import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  formatDate,
  formatDateLong,
  formatTime,
  formatDateTime,
  formatDateTimeLong,
  formatDateTimeNumeric,
  formatRelativeTime,
} from './format';

describe('date formatting utilities', () => {
  // Use a fixed timezone for consistent tests
  // Note: These tests verify the function behavior, actual output may vary by locale/timezone

  describe('formatDate', () => {
    it('should format date string to short format', () => {
      const result = formatDate('2024-01-15T14:30:00Z');
      expect(result).toMatch(/Jan\s+15,\s+2024/);
    });

    it('should format Date object to short format', () => {
      const date = new Date('2024-06-20T10:00:00Z');
      const result = formatDate(date);
      expect(result).toMatch(/Jun\s+20,\s+2024/);
    });

    it('should handle different months correctly', () => {
      expect(formatDate('2024-12-25T00:00:00Z')).toMatch(/Dec\s+25,\s+2024/);
      expect(formatDate('2024-03-01T00:00:00Z')).toMatch(/Mar\s+1,\s+2024/);
    });
  });

  describe('formatDateLong', () => {
    it('should format date to long format with full month name', () => {
      const result = formatDateLong('2024-01-15T14:30:00Z');
      expect(result).toMatch(/January\s+15,\s+2024/);
    });

    it('should format Date object to long format', () => {
      const date = new Date('2024-12-25T00:00:00Z');
      const result = formatDateLong(date);
      expect(result).toMatch(/December\s+25,\s+2024/);
    });
  });

  describe('formatTime', () => {
    it('should format time with AM/PM', () => {
      const result = formatTime('2024-01-15T14:30:00Z');
      // Result will be locale-dependent, but should contain hour:minute and AM/PM
      expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });

    it('should format Date object time', () => {
      const date = new Date('2024-01-15T09:05:00Z');
      const result = formatTime(date);
      expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });
  });

  describe('formatDateTime', () => {
    it('should return object with date, time, and full properties', () => {
      const result = formatDateTime('2024-01-15T14:30:00Z');

      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('time');
      expect(result).toHaveProperty('full');
    });

    it('should have date in short format', () => {
      const result = formatDateTime('2024-01-15T14:30:00Z');
      expect(result.date).toMatch(/Jan\s+15,\s+2024/);
    });

    it('should have time with AM/PM', () => {
      const result = formatDateTime('2024-01-15T14:30:00Z');
      expect(result.time).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });

    it('should have full combining date and time', () => {
      const result = formatDateTime('2024-01-15T14:30:00Z');
      expect(result.full).toMatch(/Jan\s+15,\s+2024/);
      expect(result.full).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });
  });

  describe('formatDateTimeLong', () => {
    it('should format with full month name and time', () => {
      const result = formatDateTimeLong('2024-01-15T14:30:00Z');
      expect(result).toMatch(/January\s+15,\s+2024/);
      expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });
  });

  describe('formatDateTimeNumeric', () => {
    it('should format in numeric MM/DD/YYYY format', () => {
      const result = formatDateTimeNumeric('2024-01-15T14:30:00Z');
      // Should contain numeric date format
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "just now" for very recent times', () => {
      const now = new Date('2024-01-15T14:30:00Z');
      vi.setSystemTime(now);

      const result = formatRelativeTime('2024-01-15T14:30:00Z');
      expect(result).toBe('just now');
    });

    it('should return minutes ago for recent times', () => {
      const now = new Date('2024-01-15T14:35:00Z');
      vi.setSystemTime(now);

      const result = formatRelativeTime('2024-01-15T14:30:00Z');
      expect(result).toBe('5m ago');
    });

    it('should return hours ago for same-day times', () => {
      const now = new Date('2024-01-15T17:30:00Z');
      vi.setSystemTime(now);

      const result = formatRelativeTime('2024-01-15T14:30:00Z');
      expect(result).toBe('3h ago');
    });

    it('should return days ago for recent days', () => {
      const now = new Date('2024-01-18T14:30:00Z');
      vi.setSystemTime(now);

      const result = formatRelativeTime('2024-01-15T14:30:00Z');
      expect(result).toBe('3d ago');
    });

    it('should return formatted date for times older than 7 days', () => {
      const now = new Date('2024-01-25T14:30:00Z');
      vi.setSystemTime(now);

      const result = formatRelativeTime('2024-01-15T14:30:00Z');
      // Should fall back to full date format
      expect(result).toMatch(/Jan\s+15,\s+2024/);
    });

    it('should handle Date objects', () => {
      const now = new Date('2024-01-15T14:35:00Z');
      vi.setSystemTime(now);

      const pastDate = new Date('2024-01-15T14:30:00Z');
      const result = formatRelativeTime(pastDate);
      expect(result).toBe('5m ago');
    });
  });
});
