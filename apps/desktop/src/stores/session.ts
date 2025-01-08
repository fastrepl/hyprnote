import { Channel } from "@tauri-apps/api/core";
import { create } from "zustand";

import { type TranscriptEvent } from "@/types/tauri";

export const useSession = create((set) => ({
  id: new Channel<TranscriptEvent>(),
  setId: (id: Channel<TranscriptEvent>) => set({ id }),
}));
