import { create } from 'zustand';
import type { Item } from '../types/inventory';

interface InventoryState {
  selectedItem: Item | null;
  searchTerm: string;
  selectedCategoryId: string | null;
  showLowStockOnly: boolean;

  setSelectedItem: (item: Item | null) => void;
  setSearchTerm: (term: string) => void;
  setSelectedCategoryId: (id: string | null) => void;
  setShowLowStockOnly: (show: boolean) => void;
  clearFilters: () => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  selectedItem: null,
  searchTerm: '',
  selectedCategoryId: null,
  showLowStockOnly: false,

  setSelectedItem: (selectedItem) => set({ selectedItem }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),
  setShowLowStockOnly: (showLowStockOnly) => set({ showLowStockOnly }),
  clearFilters: () =>
    set({
      searchTerm: '',
      selectedCategoryId: null,
      showLowStockOnly: false,
    }),
}));
