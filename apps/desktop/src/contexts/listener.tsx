import { getCurrentWindow } from "@tauri-apps/api/window";
import React, { createContext, useContext, useEffect, useRef } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { events as detectEvents } from "@hypr/plugin-detect";
import { commands as notificationCommands } from "@hypr/plugin-notification";

import { useConfigValue } from "../config/use-config";
import {
  createListenerStore,
  type ListenerStore,
} from "../store/zustand/listener";

const ListenerContext = createContext<ListenerStore | null>(null);

export const ListenerProvider = ({
  children,
  store,
}: {
  children: React.ReactNode;
  store: ListenerStore;
}) => {
  useHandleDetectEvents(store);

  const storeRef = useRef<ListenerStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = store;
  }

  return (
    <ListenerContext.Provider value={storeRef.current}>
      {children}
    </ListenerContext.Provider>
  );
};

export const useListener = <T,>(
  selector: Parameters<
    typeof useStore<ReturnType<typeof createListenerStore>, T>
  >[1],
) => {
  const store = useContext(ListenerContext);

  if (!store) {
    throw new Error("'useListener' must be used within a 'ListenerProvider'");
  }

  return useStore(store, useShallow(selector));
};

const useHandleDetectEvents = (store: ListenerStore) => {
  const stop = useStore(store, (state) => state.stop);
  const setMuted = useStore(store, (state) => state.setMuted);
  const notificationDetectEnabled = useConfigValue("notification_detect");
  const micNotificationTimeoutSecs = useConfigValue(
    "mic_notification_timeout_secs",
  );

  const notificationDetectEnabledRef = useRef(notificationDetectEnabled);
  useEffect(() => {
    notificationDetectEnabledRef.current = notificationDetectEnabled;
  }, [notificationDetectEnabled]);

  const micNotificationTimeoutSecsRef = useRef(micNotificationTimeoutSecs);
  useEffect(() => {
    micNotificationTimeoutSecsRef.current = micNotificationTimeoutSecs;
  }, [micNotificationTimeoutSecs]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    detectEvents.detectEvent
      .listen(({ payload }) => {
        if (payload.type === "micDetected") {
          if (!notificationDetectEnabledRef.current) {
            return;
          }

          if (store.getState().live.status === "active") {
            return;
          }

          void getCurrentWindow()
            .isFocused()
            .then((isFocused) => {
              if (isFocused) {
                return;
              }

              const durationSecs = payload.duration_secs;
              const title =
                durationSecs > 0 ? "Meeting in progress?" : "Mic detected";
              const message =
                durationSecs >= 60
                  ? `Mic used for ${Math.round(durationSecs / 60)} minutes. Start listening?`
                  : durationSecs > 0
                    ? `Mic used for ${durationSecs} seconds. Start listening?`
                    : "A meeting app is using your mic";

              void notificationCommands.showNotification({
                key: payload.key,
                title,
                message,
                timeout: {
                  secs: micNotificationTimeoutSecsRef.current,
                  nanos: 0,
                },
                event_id: null,
                start_time: null,
                participants: null,
                event_details: null,
                action_label: null,
              });
            });
        } else if (payload.type === "micStopped") {
          stop();
        } else if (payload.type === "sleepStateChanged") {
          if (payload.value) {
            stop();
          }
        } else if (payload.type === "micMuted") {
          setMuted(payload.value);
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unlisten = fn;
        }
      })
      .catch((err) => {
        console.error("Failed to setup detect event listener:", err);
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [stop, setMuted]);
};
