import { create } from "zustand";

import type { ContextEntity } from "../../chat/context-item";

type PerGroupContext = {
  attachedSessionId: string | null;
  contextEntities: ContextEntity[];
};

interface ChatContextState {
  groupId: string | undefined;
  contexts: Record<string, PerGroupContext>;
}

interface ChatContextActions {
  setGroupId: (groupId: string | undefined) => void;
  persistContext: (
    groupId: string,
    attachedSessionId: string | null,
    entities: ContextEntity[],
  ) => void;
  getPersistedContext: (groupId: string) => PerGroupContext | undefined;
}

export const useChatContext = create<ChatContextState & ChatContextActions>(
  (set, get) => ({
    groupId: undefined,
    contexts: {},
    setGroupId: (groupId) => set({ groupId }),
    persistContext: (groupId, attachedSessionId, entities) => {
      const prev = get().contexts[groupId];
      const prevEntities = prev?.contextEntities ?? [];

      const seen = new Set<string>();
      const merged: ContextEntity[] = [];
      for (const e of prevEntities) {
        if (!seen.has(e.key)) {
          seen.add(e.key);
          merged.push(e);
        }
      }
      for (const e of entities) {
        if (!seen.has(e.key)) {
          seen.add(e.key);
          merged.push(e);
        }
      }

      set({
        contexts: {
          ...get().contexts,
          [groupId]: { attachedSessionId, contextEntities: merged },
        },
      });
    },
    getPersistedContext: (groupId) => get().contexts[groupId],
  }),
);
