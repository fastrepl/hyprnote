import { create } from "zustand";

export const useUI = create<{
  isPanelOpen: boolean;
  setIsPanelOpen: (isPanelOpen: boolean) => void;
}>((set) => ({
  isPanelOpen: false,
  setIsPanelOpen: (isPanelOpen) => set({ isPanelOpen }),
}));
