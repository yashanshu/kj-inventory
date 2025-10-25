import { describe, expect, it } from 'vitest';
import { canEditItems, canManageCategories, canViewUnitCost, isAdmin } from './roles';

describe('role helpers', () => {
  describe('isAdmin', () => {
    it('returns true for admin role', () => {
      expect(isAdmin('ADMIN')).toBe(true);
    });

    it('returns false for non-admin roles', () => {
      expect(isAdmin('MANAGER')).toBe(false);
      expect(isAdmin('USER')).toBe(false);
      expect(isAdmin(undefined)).toBe(false);
    });
  });

  describe('canEditItems', () => {
    it('allows editing for admins', () => {
      expect(canEditItems('ADMIN')).toBe(true);
    });

    it('blocks editing for non-admin roles', () => {
      expect(canEditItems('MANAGER')).toBe(false);
      expect(canEditItems('USER')).toBe(false);
    });
  });

  describe('canViewUnitCost', () => {
    it('allows admins to view unit cost', () => {
      expect(canViewUnitCost('ADMIN')).toBe(true);
    });

    it('hides unit cost for non-admin roles', () => {
      expect(canViewUnitCost('MANAGER')).toBe(false);
      expect(canViewUnitCost('USER')).toBe(false);
      expect(canViewUnitCost(undefined)).toBe(false);
    });
  });

  describe('canManageCategories', () => {
    it('allows admins to manage categories', () => {
      expect(canManageCategories('ADMIN')).toBe(true);
    });

    it('blocks category management for non-admin roles', () => {
      expect(canManageCategories('MANAGER')).toBe(false);
      expect(canManageCategories('USER')).toBe(false);
    });
  });
});
