import { create as mutate } from "mutative";
import { createStore } from "zustand";

import { commands as listenerCommands, events as listenerEvents } from "@hypr/plugin-listener";

type State = {
  sessionEventUnlisten?: () => void;
  loading: boolean;
  status: "inactive" | "running_active";
  amplitude: { mic: number; speaker: number };
};

type Actions = {
  get: () => State & Actions;
  start: () => void;
  stop: () => void;
};

const initialState: State = {
  status: "inactive",
  loading: false,
  amplitude: { mic: 0, speaker: 0 },
};

export type ListenerStore = ReturnType<typeof createListenerStore>;

export const createListenerStore = () => {
  return createStore<State & Actions>((set, get) => ({
    ...initialState,
    get: () => get(),
    start: () => {
      set((state) =>
        mutate(state, (draft) => {
          draft.loading = true;
        })
      );

      listenerEvents.sessionEvent.listen(({ payload }) => {
        if (payload.type === "audioAmplitude") {
          set((state) =>
            mutate(state, (draft) => {
              draft.amplitude = {
                mic: payload.mic,
                speaker: payload.speaker,
              };
            })
          );
        } else if (payload.type === "running_active") {
          set((state) =>
            mutate(state, (draft) => {
              draft.status = "running_active";
              draft.loading = false;
            })
          );
        } else if (payload.type === "inactive") {
          set((state) =>
            mutate(state, (draft) => {
              draft.status = "inactive";
              draft.loading = false;
            })
          );
        } else if (payload.type === "streamResponse") {
          set((state) =>
            mutate(state, (_draft) => {
              console.log(payload.response);
            })
          );
        }
      }).then((unlisten) => {
        set((state) =>
          mutate(state, (draft) => {
            draft.sessionEventUnlisten = unlisten;
          })
        );
      });

      listenerCommands.startSession("").then(() => {
        set({ status: "running_active", loading: false });
      }).catch((error) => {
        console.error(error);
        set(initialState);
      });
    },
    stop: () => {
      set((state) =>
        mutate(state, (draft) => {
          draft.loading = true;
        })
      );

      listenerCommands.stopSession().then(() => {
        set(initialState);
      }).catch((error) => {
        console.error("Failed to stop session:", error);
        set((state) =>
          mutate(state, (draft) => {
            draft.loading = false;
          })
        );
      });
    },
  }));
};
