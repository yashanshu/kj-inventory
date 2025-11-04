import { z } from 'zod';

/**
 * Zod schemas for inventory form validation
 * Mobile-first: Provides clear, accessible error messages
 */

// Unit enum schema
export const unitSchema = z.enum(['pcs', 'kg', 'gm', 'ltr'], {
  message: 'Please select a valid unit',
});

// Add Item Form Schema
export const addItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Item name is required')
    .max(100, 'Item name must be less than 100 characters')
    .trim(),

  sku: z
    .string()
    .max(50, 'SKU must be less than 50 characters')
    .trim()
    .optional()
    .or(z.literal('')),

  categoryId: z
    .string()
    .min(1, 'Please select a category'),

  unit: unitSchema,

  currentStock: z
    .number({ message: 'Stock must be a number' })
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative'),

  minimumThreshold: z
    .number({ message: 'Threshold must be a number' })
    .int('Threshold must be a whole number')
    .min(0, 'Threshold cannot be negative'),

  unitCost: z
    .number({ message: 'Unit cost must be a number' })
    .min(0, 'Unit cost cannot be negative')
    .optional()
    .or(z.literal(undefined)),

  trackStock: z.boolean(),
});

export type AddItemFormData = z.infer<typeof addItemSchema>;

// Edit Item Form Schema
export const editItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Item name is required')
    .max(100, 'Item name must be less than 100 characters')
    .trim(),

  sku: z
    .string()
    .max(50, 'SKU must be less than 50 characters')
    .trim()
    .optional()
    .or(z.literal('')),

  categoryId: z
    .string()
    .min(1, 'Please select a category'),

  unit: unitSchema,

  minimumThreshold: z
    .number({ message: 'Threshold must be a number' })
    .int('Threshold must be a whole number')
    .min(0, 'Threshold cannot be negative'),

  unitCost: z
    .number({ message: 'Unit cost must be a number' })
    .min(0, 'Unit cost cannot be negative')
    .optional()
    .or(z.literal(undefined)),

  trackStock: z.boolean(),

  isActive: z.boolean(),
});

export type EditItemFormData = z.infer<typeof editItemSchema>;

// Stock Adjustment Schema
export const stockAdjustmentSchema = z.object({
  adjustment: z
    .number({ message: 'Adjustment must be a number' })
    .int('Adjustment must be a whole number')
    .refine(
      (val) => val !== 0,
      { message: 'Adjustment cannot be zero' }
    ),

  reason: z
    .string()
    .max(200, 'Reason must be less than 200 characters')
    .optional()
    .or(z.literal('')),
});

export type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>;

// Category Schema
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(50, 'Category name must be less than 50 characters')
    .trim(),

  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Please select a valid color'),

  description: z
    .string()
    .max(200, 'Description must be less than 200 characters')
    .optional()
    .or(z.literal('')),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// Movement Type enum schema
export const movementTypeSchema = z.enum(['IN', 'OUT', 'ADJUSTMENT'], {
  message: 'Please select a valid movement type',
});

// Stock Movement Form Schema (for bottom sheet)
export const stockMovementSchema = z.object({
  movementType: movementTypeSchema,

  quantity: z
    .number({ message: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .positive('Quantity must be greater than 0'),

  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

export type StockMovementFormData = z.infer<typeof stockMovementSchema>;
