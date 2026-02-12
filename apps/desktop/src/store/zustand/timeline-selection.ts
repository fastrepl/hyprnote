import { create } from "zustand";

interface TimelineSelectionState {
  selectedIds: string[];
  anchorId: string | null;
  setAnchor: (id: string) => void;
  selectRange: (flatItemKeys: string[], targetId: string) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
}

export const useTimelineSelection = create<TimelineSelectionState>(
  (set, get) => ({
    selectedIds: [],
    anchorId: null,
    setAnchor: (id) => set({ anchorId: id, selectedIds: [] }),
    selectRange: (flatItemKeys, targetId) => {
      const { anchorId } = get();
      if (!anchorId) {
        set({ anchorId: targetId, selectedIds: [targetId] });
        return;
      }

      const anchorIndex = flatItemKeys.indexOf(anchorId);
      const targetIndex = flatItemKeys.indexOf(targetId);

      if (anchorIndex === -1 || targetIndex === -1) {
        set({ anchorId: targetId, selectedIds: [targetId] });
        return;
      }

      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);
      const range = flatItemKeys.slice(start, end + 1);

      set({ selectedIds: range });
    },
    clear: () => set({ selectedIds: [], anchorId: null }),
    isSelected: (id) => get().selectedIds.includes(id),
  }),
);
