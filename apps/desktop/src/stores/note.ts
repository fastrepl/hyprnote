import { create } from "zustand";

export const useNote = create<{
  id: string;
  setId: (id: string) => void;
}>((set) => ({
  id: "",
  setId: (id) => set({ id }),
}));
