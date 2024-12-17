import { create, createStore } from "zustand";
import { persist } from "zustand/middleware";

interface EditorStore {
  transcript: string;
  updateTranscript: (transcript: string) => void;
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => ({
      transcript: "",
      updateTranscript: (transcript: string) => set({ transcript }),
    }),
    { name: "editor" },
  ),
);
