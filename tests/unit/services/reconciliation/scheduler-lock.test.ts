import { describe, it, expect } from 'vitest';
import { LOCK_IDS } from '@/src/services/reconciliation/scheduler-lock.js';

describe('Scheduler Lock', () => {
  describe('LOCK_IDS', () => {
    it('should have unique lock IDs for each scheduler', () => {
      const lockIds = Object.values(LOCK_IDS);
      const uniqueIds = new Set(lockIds);
      expect(uniqueIds.size).toBe(lockIds.length);
    });

    it('should define reconciliation_scheduler lock ID', () => {
      expect(LOCK_IDS.reconciliation_scheduler).toBeDefined();
      expect(typeof LOCK_IDS.reconciliation_scheduler).toBe('number');
    });

    it('should define token_classification_scheduler lock ID', () => {
      expect(LOCK_IDS.token_classification_scheduler).toBeDefined();
      expect(typeof LOCK_IDS.token_classification_scheduler).toBe('number');
    });
  });

  describe('getLockId collision prevention', () => {
    // Simulate the getLockId function to test collision prevention logic
    function simulateGetLockId(lockName: string): number {
      const reservedLockIds = new Set(Object.values(LOCK_IDS));

      if (lockName in LOCK_IDS) {
        return LOCK_IDS[lockName as keyof typeof LOCK_IDS];
      }

      // Replicate the hash function from scheduler-lock.ts
      let hash = 0;
      for (let i = 0; i < lockName.length; i++) {
        const char = lockName.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      let lockId = Math.abs(hash);

      // Collision prevention - same as in scheduler-lock.ts
      while (reservedLockIds.has(lockId)) {
        lockId = lockId + 1;
      }

      return lockId;
    }

    it('should return known lock ID for reconciliation_scheduler', () => {
      const lockId = simulateGetLockId('reconciliation_scheduler');
      expect(lockId).toBe(LOCK_IDS.reconciliation_scheduler);
    });

    it('should return known lock ID for token_classification_scheduler', () => {
      const lockId = simulateGetLockId('token_classification_scheduler');
      expect(lockId).toBe(LOCK_IDS.token_classification_scheduler);
    });

    it('should generate a hash for unknown lock names', () => {
      const lockId = simulateGetLockId('some_new_scheduler');
      expect(typeof lockId).toBe('number');
      expect(lockId).toBeGreaterThan(0);
    });

    it('should not collide with reserved lock IDs', () => {
      const reservedIds = new Set(Object.values(LOCK_IDS));
      const testNames = ['test_scheduler', 'new_lock', 'custom_job'];

      for (const name of testNames) {
        const lockId = simulateGetLockId(name);
        expect(reservedIds.has(lockId)).toBe(false);
      }
    });

    it('should increment lockId when collision detected', () => {
      const reservedLockIds = new Set(Object.values(LOCK_IDS));

      function testCollisionPrevention(initialHash: number): number {
        let lockId = initialHash;
        while (reservedLockIds.has(lockId)) {
          lockId = lockId + 1;
        }
        return lockId;
      }

      // Starting with a reserved ID should return the next available number
      const reservedId = LOCK_IDS.reconciliation_scheduler;
      const result = testCollisionPrevention(reservedId);

      expect(result).not.toBe(reservedId);
      expect(reservedLockIds.has(result)).toBe(false);
    });
  });
});
