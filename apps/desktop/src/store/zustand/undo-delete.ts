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

interface UndoDeleteState {
  deletedSession: DeletedSessionData | null;
  timeoutId: ReturnType<typeof setTimeout> | null;
  setDeletedSession: (data: DeletedSessionData | null) => void;
  setTimeoutId: (id: ReturnType<typeof setTimeout> | null) => void;
  clear: () => void;
}

export const useUndoDelete = create<UndoDeleteState>((set, get) => ({
  deletedSession: null,
  timeoutId: null,
  setDeletedSession: (data) => set({ deletedSession: data }),
  setTimeoutId: (id) => {
    const currentId = get().timeoutId;
    if (currentId) {
      clearTimeout(currentId);
    }
    set({ timeoutId: id });
  },
  clear: () => {
    const currentId = get().timeoutId;
    if (currentId) {
      clearTimeout(currentId);
    }
    set({ deletedSession: null, timeoutId: null });
  },
}));
