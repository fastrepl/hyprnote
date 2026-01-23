import { create } from "zustand";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import * as main from "../tinybase/store/main";

type Checkpoints = NonNullable<ReturnType<typeof main.UI.useCheckpoints>>;

interface PendingDelete {
  sessionId: string;
  sessionTitle: string;
  checkpointId: string;
  timeoutId: ReturnType<typeof setTimeout>;
}

interface UndoDeleteState {
  pendingDelete: PendingDelete | null;
  checkpoints: Checkpoints | null;
  setCheckpoints: (checkpoints: Checkpoints | null) => void;
  scheduleDeletion: (
    sessionId: string,
    sessionTitle: string,
    checkpointId: string,
  ) => void;
  undo: () => void;
  clear: () => void;
}

const UNDO_TIMEOUT_MS = 5000;

export function getPendingDeleteSessionIds(): string[] {
  const state = useUndoDeleteStore.getState();
  if (state.pendingDelete) {
    return [state.pendingDelete.sessionId];
  }
  return [];
}

export const useUndoDeleteStore = create<UndoDeleteState>((set, get) => ({
  pendingDelete: null,
  checkpoints: null,

  setCheckpoints: (checkpoints) => {
    set({ checkpoints });
  },

  scheduleDeletion: (sessionId, sessionTitle, checkpointId) => {
    const { pendingDelete, clear } = get();

    if (pendingDelete) {
      clearTimeout(pendingDelete.timeoutId);
      void fsSyncCommands.audioDelete(pendingDelete.sessionId);
    }

    const timeoutId = setTimeout(() => {
      void fsSyncCommands.audioDelete(sessionId);
      clear();
    }, UNDO_TIMEOUT_MS);

    set({
      pendingDelete: {
        sessionId,
        sessionTitle,
        checkpointId,
        timeoutId,
      },
    });
  },

  undo: () => {
    const { pendingDelete, checkpoints, clear } = get();

    if (!pendingDelete || !checkpoints) {
      return;
    }

    clearTimeout(pendingDelete.timeoutId);
    checkpoints.goTo(pendingDelete.checkpointId);
    checkpoints.clear();
    clear();
  },

  clear: () => {
    set({ pendingDelete: null });
  },
}));
