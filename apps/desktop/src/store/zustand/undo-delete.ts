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

interface UndoDeleteState {
  deletedSession: DeletedSessionData | null;
  timeoutId: ReturnType<typeof setTimeout> | null;
  isPaused: boolean;
  remainingTime: number;
  onDeleteConfirm: (() => void) | null;
  setDeletedSession: (
    data: DeletedSessionData | null,
    onConfirm?: () => void,
  ) => void;
  setTimeoutId: (id: ReturnType<typeof setTimeout> | null) => void;
  pause: () => void;
  resume: () => void;
  clear: () => void;
  confirmDelete: () => void;
}

export const useUndoDelete = create<UndoDeleteState>((set, get) => ({
  deletedSession: null,
  timeoutId: null,
  isPaused: false,
  remainingTime: UNDO_TIMEOUT_MS,
  onDeleteConfirm: null,
  setDeletedSession: (data, onConfirm) => {
    const { onDeleteConfirm, timeoutId } = get();
    if (onDeleteConfirm) {
      onDeleteConfirm();
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    set({
      deletedSession: data,
      remainingTime: UNDO_TIMEOUT_MS,
      onDeleteConfirm: onConfirm ?? null,
      timeoutId: null,
      isPaused: false,
    });
  },
  setTimeoutId: (id) => {
    const currentId = get().timeoutId;
    if (currentId) {
      clearTimeout(currentId);
    }
    set({ timeoutId: id });
  },
  pause: () => {
    const { timeoutId, deletedSession, isPaused } = get();
    if (isPaused || !deletedSession) return;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const elapsed = Date.now() - deletedSession.deletedAt;
    const remaining = Math.max(0, UNDO_TIMEOUT_MS - elapsed);
    set({ isPaused: true, remainingTime: remaining, timeoutId: null });
  },
  resume: () => {
    const { isPaused, remainingTime, deletedSession, confirmDelete } = get();
    if (!isPaused || !deletedSession) return;

    const newDeletedAt = Date.now() - (UNDO_TIMEOUT_MS - remainingTime);
    set({
      isPaused: false,
      deletedSession: { ...deletedSession, deletedAt: newDeletedAt },
    });

    const timeoutId = setTimeout(() => {
      confirmDelete();
    }, remainingTime);
    set({ timeoutId });
  },
  clear: () => {
    const currentId = get().timeoutId;
    if (currentId) {
      clearTimeout(currentId);
    }
    set({
      deletedSession: null,
      timeoutId: null,
      isPaused: false,
      remainingTime: UNDO_TIMEOUT_MS,
      onDeleteConfirm: null,
    });
  },
  confirmDelete: () => {
    const { onDeleteConfirm, clear } = get();
    if (onDeleteConfirm) {
      onDeleteConfirm();
    }
    clear();
  },
}));
