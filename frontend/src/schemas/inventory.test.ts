import { describe, it, expect } from 'vitest';
import {
  addItemSchema,
  editItemSchema,
  stockAdjustmentSchema,
  categorySchema,
} from './inventory';

describe('Inventory Schemas', () => {
  describe('addItemSchema', () => {
    it('should validate a valid add item form', () => {
      const validData = {
        name: 'Test Item',
        sku: 'TEST-001',
        categoryId: 'cat-123',
        unit: 'pcs' as const,
        currentStock: 10,
        minimumThreshold: 5,
        unitCost: 9.99,
        trackStock: true,
      };

      const result = addItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        categoryId: 'cat-123',
        unit: 'pcs' as const,
        currentStock: 10,
        minimumThreshold: 5,
        trackStock: true,
      };

      const result = addItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required');
      }
    });

    it('should reject negative stock', () => {
      const invalidData = {
        name: 'Test Item',
        categoryId: 'cat-123',
        unit: 'pcs' as const,
        currentStock: -5,
        minimumThreshold: 5,
        trackStock: true,
      };

      const result = addItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot be negative');
      }
    });

    it('should accept optional SKU', () => {
      const validData = {
        name: 'Test Item',
        categoryId: 'cat-123',
        unit: 'kg' as const,
        currentStock: 10,
        minimumThreshold: 5,
        trackStock: true,
      };

      const result = addItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept optional unitCost', () => {
      const validData = {
        name: 'Test Item',
        categoryId: 'cat-123',
        unit: 'ltr' as const,
        currentStock: 10,
        minimumThreshold: 5,
        trackStock: false,
      };

      const result = addItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('editItemSchema', () => {
    it('should validate a valid edit item form', () => {
      const validData = {
        name: 'Updated Item',
        sku: 'UPD-001',
        categoryId: 'cat-456',
        unit: 'gm' as const,
        minimumThreshold: 10,
        unitCost: 19.99,
        trackStock: true,
        isActive: true,
      };

      const result = editItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid unit', () => {
      const invalidData = {
        name: 'Test Item',
        categoryId: 'cat-123',
        unit: 'invalid',
        minimumThreshold: 5,
        trackStock: true,
        isActive: true,
      };

      const result = editItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require trackStock boolean', () => {
      const invalidData = {
        name: 'Test Item',
        categoryId: 'cat-123',
        unit: 'pcs' as const,
        minimumThreshold: 5,
        isActive: true,
      };

      const result = editItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('stockAdjustmentSchema', () => {
    it('should validate positive adjustment', () => {
      const validData = {
        adjustment: 10,
        reason: 'Restocking',
      };

      const result = stockAdjustmentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate negative adjustment', () => {
      const validData = {
        adjustment: -5,
        reason: 'Sold',
      };

      const result = stockAdjustmentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject zero adjustment', () => {
      const invalidData = {
        adjustment: 0,
        reason: 'Test',
      };

      const result = stockAdjustmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot be zero');
      }
    });

    it('should accept optional reason', () => {
      const validData = {
        adjustment: 10,
      };

      const result = stockAdjustmentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('categorySchema', () => {
    it('should validate a valid category', () => {
      const validData = {
        name: 'Electronics',
        color: '#3b82f6',
        description: 'Electronic devices and accessories',
      };

      const result = categorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid color format', () => {
      const invalidData = {
        name: 'Electronics',
        color: 'blue',
        description: 'Test',
      };

      const result = categorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid color');
      }
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        color: '#ff0000',
      };

      const result = categorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional description', () => {
      const validData = {
        name: 'Test Category',
        color: '#00ff00',
      };

      const result = categorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
