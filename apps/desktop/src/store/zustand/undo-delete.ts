import { create } from "zustand";

type SessionRow = {
  id: string;
  user_id: string;
  created_at: string;
  folder_id: string;
  event_id: string;
  title: string;
  raw_md: string;
};

type TranscriptRow = {
  id: string;
  user_id: string;
  created_at: string;
  session_id: string;
  started_at: number;
  ended_at: number;
  words: string;
  speaker_hints: string;
};

type ParticipantRow = {
  id: string;
  user_id: string;
  session_id: string;
  human_id: string;
  source: string;
};

type TagSessionRow = {
  id: string;
  user_id: string;
  tag_id: string;
  session_id: string;
};

type EnhancedNoteRow = {
  id: string;
  user_id: string;
  session_id: string;
  content: string;
  template_id: string;
  position: number;
  title: string;
};

export type DeletedSessionData = {
  session: SessionRow;
  transcripts: TranscriptRow[];
  participants: ParticipantRow[];
  tagSessions: TagSessionRow[];
  enhancedNotes: EnhancedNoteRow[];
  deletedAt: number;
};

export const UNDO_TIMEOUT_MS = 5000;

export type PendingDeletion = {
  data: DeletedSessionData;
  timeoutId: ReturnType<typeof setTimeout> | null;
  onDeleteConfirm: (() => void) | null;
  addedAt: number;
  batchId: string | null;
};

interface UndoDeleteState {
  pendingDeletions: Record<string, PendingDeletion>;
  addDeletion: (
    data: DeletedSessionData,
    onConfirm?: () => void,
    batchId?: string,
  ) => void;
  clearDeletion: (sessionId: string) => void;
  confirmDeletion: (sessionId: string) => void;
  clearBatch: (batchId: string) => void;
  confirmBatch: (batchId: string) => void;
}

export const useUndoDelete = create<UndoDeleteState>((set, get) => ({
  pendingDeletions: {},

  addDeletion: (data, onConfirm, batchId) => {
    const sessionId = data.session.id;

    const timeoutId = setTimeout(() => {
      get().confirmDeletion(sessionId);
    }, UNDO_TIMEOUT_MS);

    set((state) => ({
      pendingDeletions: {
        ...state.pendingDeletions,
        [sessionId]: {
          data,
          timeoutId,
          onDeleteConfirm: onConfirm ?? null,
          addedAt: Date.now(),
          batchId: batchId ?? null,
        },
      },
    }));
  },

  clearDeletion: (sessionId) => {
    const pending = get().pendingDeletions[sessionId];
    if (!pending) return;

    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }

    set((state) => {
      const { [sessionId]: _, ...rest } = state.pendingDeletions;
      return { pendingDeletions: rest };
    });
  },

  confirmDeletion: (sessionId) => {
    const pending = get().pendingDeletions[sessionId];
    if (!pending) return;

    if (pending.onDeleteConfirm) {
      pending.onDeleteConfirm();
    }
    get().clearDeletion(sessionId);
  },

  clearBatch: (batchId) => {
    const entries = Object.entries(get().pendingDeletions).filter(
      ([_, p]) => p.batchId === batchId,
    );
    for (const [sessionId] of entries) {
      get().clearDeletion(sessionId);
    }
  },

  confirmBatch: (batchId) => {
    const entries = Object.entries(get().pendingDeletions).filter(
      ([_, p]) => p.batchId === batchId,
    );
    for (const [sessionId] of entries) {
      get().confirmDeletion(sessionId);
    }
  },
}));
