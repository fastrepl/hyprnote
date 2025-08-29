import { create as mutate } from "mutative";
import { createStore } from "zustand";

import { commands as dbCommands, type Session } from "@hypr/plugin-db";
import pDebounce from "p-debounce";

type State = {
  session: Session;
  showRaw: boolean;
  activeTab: 'raw' | 'enhanced' | 'transcript';
};

type Actions = {
  get: () => State & Actions;
  refresh: () => Promise<void>;
  setShowRaw: (showRaw: boolean) => void;
  setActiveTab: (tab: 'raw' | 'enhanced' | 'transcript') => void;
  updateTitle: (title: string) => void;
  updatePreMeetingNote: (note: string) => void;
  updateRawNote: (note: string) => void;
  updateEnhancedNote: (note: string) => void;
  persistSession: (session?: Session, force?: boolean) => Promise<void>;
};

export type SessionStore = ReturnType<typeof createSessionStore>;

export const createSessionStore = (session: Session) => {
  return createStore<State & Actions>((set, get) => ({
    session,
    showRaw: !session.enhanced_memo_html,
    activeTab: 'raw',
    get,
    refresh: async () => {
      const { session: { id } } = get();
      const session = await dbCommands.getSession({ id });
      if (session) {
        set({ session });
      }
    },
    setShowRaw: (showRaw: boolean) => {
      set((state) =>
        mutate(state, (draft) => {
          draft.showRaw = showRaw;
        })
      );
    },
    setActiveTab: (tab: 'raw' | 'enhanced' | 'transcript') => {
      set((state) =>
        mutate(state, (draft) => {
          draft.activeTab = tab;
          // Keep showRaw in sync for backward compatibility
          if (tab === 'raw') {
            draft.showRaw = true;
          } else if (tab === 'enhanced') {
            draft.showRaw = false;
          }
          // transcript doesn't affect showRaw
        })
      );
    },
    updateTitle: (title: string) => {
      set((state) => {
        const next = mutate(state, (draft) => {
          draft.session.title = title;
        });
        get().persistSession(next.session);
        return next;
      });
    },
    updatePreMeetingNote: (note: string) => {
      set((state) => {
        const next = mutate(state, (draft) => {
          draft.session.pre_meeting_memo_html = note;
        });
        get().persistSession(next.session);
        return next;
      });
    },
    updateRawNote: (note: string) => {
      set((state) => {
        const next = mutate(state, (draft) => {
          draft.session.raw_memo_html = note;
        });
        get().persistSession(next.session);
        return next;
      });
    },
    updateEnhancedNote: (note: string) => {
      set((state) => {
        const next = mutate(state, (draft) => {
          draft.showRaw = false;
          draft.session.enhanced_memo_html = note;
        });
        get().persistSession(next.session);
        return next;
      });
    },
    persistSession: async (session?: Session, force?: boolean) => {
      const { session: { id } } = get();
      const sessionFromDB = await dbCommands.getSession({ id });
      const { record_start, record_end, ...rest } = session ?? get().session;

      // TODO: This is still a bit hacky - the purpose is to not overwrite the record_start/end part.
      const item: Session = {
        record_start: null,
        record_end: null,
        ...(sessionFromDB || {}),
        ...rest,
        words: sessionFromDB?.words ?? [],
      };

      const fn = force
        ? dbCommands.upsertSession
        : pDebounce((v: Session) => dbCommands.upsertSession(v), 50);
      await fn(item);
    },
  }));
};
