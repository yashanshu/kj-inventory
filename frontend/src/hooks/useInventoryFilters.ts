import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInventoryStore } from '../store/inventoryStore';

export interface InventoryFilters {
  searchTerm: string;
  selectedCategoryId: string | null;
  lowStockOnly: boolean;
  page: number;
  pageSize: number;
}

export function useInventoryFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    searchTerm,
    setSearchTerm,
    selectedCategoryId,
    setSelectedCategoryId,
  } = useInventoryStore();

  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [lowStockOnly, setLowStockOnly] = useState(() => {
    // Initialize from URL parameter if present
    return searchParams.get('lowStock') === 'true';
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Clear URL parameter after reading it on mount
  useEffect(() => {
    if (searchParams.has('lowStock')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('lowStock');
      setSearchParams(newParams, { replace: true });
    }
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
      setPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchTerm, setSearchTerm]);

  const handleCategoryChange = useCallback(
    (categoryId: string | null) => {
      setSelectedCategoryId(categoryId);
      setPage(1); // Reset to first page on category change
    },
    [setSelectedCategoryId]
  );

  const handleLowStockToggle = useCallback(() => {
    setLowStockOnly((prev) => !prev);
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setLocalSearchTerm('');
    setSearchTerm('');
    setSelectedCategoryId(null);
    setLowStockOnly(false);
    setPage(1);
  }, [setSearchTerm, setSelectedCategoryId]);

  return {
    // Filter values
    localSearchTerm,
    searchTerm,
    selectedCategoryId,
    lowStockOnly,
    page,
    pageSize,

    // Filter setters
    setLocalSearchTerm,
    handleCategoryChange,
    handleLowStockToggle,
    setPage,
    handlePageSizeChange,
    resetFilters,

    // Query params for API
    queryParams: {
      search: searchTerm || undefined,
      categoryId: selectedCategoryId || undefined,
      lowStock: lowStockOnly ? true : undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    },
  };
}
