import { create } from 'zustand';

interface UIState {
  // Quick-add form state: remembers last used values for faster repeat entry.
  lastCategoryId: string | null;
  lastFundingSource: string | null;
  setLastCategory: (id: string) => void;
  setLastFundingSource: (fs: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  lastCategoryId: null,
  lastFundingSource: null,
  setLastCategory: (id) => set({ lastCategoryId: id }),
  setLastFundingSource: (fs) => set({ lastFundingSource: fs }),
}));
