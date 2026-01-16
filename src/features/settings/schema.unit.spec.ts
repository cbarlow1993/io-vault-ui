import { describe, it, expect } from 'vitest';
import {
  zModule,
  zModuleRole,
  zAssignModuleRoleInput,
  zRemoveModuleRoleInput,
} from './schema';

describe('Module Access Schemas', () => {
  describe('zModule', () => {
    it('should validate a valid module', () => {
      const module = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'treasury',
        display_name: 'Treasury',
        is_active: true,
      };
      expect(zModule.parse(module)).toEqual(module);
    });

    it('should reject invalid uuid', () => {
      const module = {
        id: 'not-a-uuid',
        name: 'treasury',
        display_name: 'Treasury',
        is_active: true,
      };
      expect(() => zModule.parse(module)).toThrow();
    });
  });

  describe('zModuleRole', () => {
    it('should validate a valid role', () => {
      const role = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'admin',
        display_name: 'Admin',
      };
      expect(zModuleRole.parse(role)).toEqual(role);
    });
  });

  describe('zAssignModuleRoleInput', () => {
    it('should validate valid input', () => {
      const input = {
        userId: 'user_123',
        moduleId: 'treasury',
        role: 'admin',
      };
      expect(zAssignModuleRoleInput.parse(input)).toEqual(input);
    });

    it('should reject missing fields', () => {
      expect(() => zAssignModuleRoleInput.parse({})).toThrow();
    });
  });

  describe('zRemoveModuleRoleInput', () => {
    it('should validate valid input', () => {
      const input = {
        userId: 'user_123',
        moduleId: 'treasury',
      };
      expect(zRemoveModuleRoleInput.parse(input)).toEqual(input);
    });
  });
});
