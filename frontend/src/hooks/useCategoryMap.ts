import { useMemo } from 'react';
import type { Category } from '../types/inventory';

/**
 * Hook to create a map of category IDs to category objects for fast lookups
 */
export function useCategoryMap(categories?: Category[]) {
  return useMemo(() => {
    if (!categories) return new Map<string, Category>();

    return new Map(
      categories.map((category) => [category.id, category])
    );
  }, [categories]);
}

/**
 * Hook to get a category by ID with a fallback
 */
export function useCategory(categoryId: string, categories?: Category[]) {
  const categoryMap = useCategoryMap(categories);

  return useMemo(() => {
    return categoryMap.get(categoryId) || null;
  }, [categoryMap, categoryId]);
}
