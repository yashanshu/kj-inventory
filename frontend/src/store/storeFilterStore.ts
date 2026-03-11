import { create } from 'zustand';

interface StoreFilterState {
  selectedStoreId: string | null;
  setSelectedStoreId: (id: string | null) => void;
}

export const useStoreFilterStore = create<StoreFilterState>((set) => ({
  selectedStoreId: null,
  setSelectedStoreId: (id) => set({ selectedStoreId: id }),
}));
