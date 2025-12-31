import { type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";

import { events as notificationEvents } from "@hypr/plugin-notification";
import {
  commands as updaterCommands,
  events as updaterEvents,
} from "@hypr/plugin-updater2";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

import * as main from "../store/tinybase/main";
import { getOrCreateSessionForEventId } from "../store/tinybase/sessions";
import { useTabs } from "../store/zustand/tabs";

function useUpdaterEvents() {
  const openNew = useTabs((state) => state.openNew);

  useEffect(() => {
    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    let unlisten: UnlistenFn | null = null;

    void updaterEvents.updatedEvent
      .listen(({ payload: { previous, current } }) => {
        openNew({
          type: "changelog",
          state: { previous, current },
        });
      })
      .then((f) => {
        unlisten = f;
        updaterCommands.maybeEmitUpdated();
      });

    return () => {
      unlisten?.();
    };
  }, [openNew]);
}

function useNotificationEvents() {
  const store = main.UI.useStore(main.STORE_ID);
  const openNew = useTabs((state) => state.openNew);
  const pendingEventId = useRef<string | null>(null);

  useEffect(() => {
    if (pendingEventId.current && store) {
      const eventId = pendingEventId.current;
      pendingEventId.current = null;
      const sessionId = getOrCreateSessionForEventId(store, eventId);
      openNew({
        type: "sessions",
        id: sessionId,
        state: { view: null, autoStart: true },
      });
    }
  }, [store, openNew]);

  useEffect(() => {
    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    let unlisten: UnlistenFn | null = null;

    void notificationEvents.notificationEvent
      .listen(({ payload }) => {
        if (
          (payload.type === "notification_confirm" ||
            payload.type === "notification_accept") &&
          payload.event_id
        ) {
          if (!store) {
            pendingEventId.current = payload.event_id;
            return;
          }
          const sessionId = getOrCreateSessionForEventId(
            store,
            payload.event_id,
          );
          openNew({
            type: "sessions",
            id: sessionId,
            state: { view: null, autoStart: true },
          });
        }
      })
      .then((f) => {
        unlisten = f;
      });

    return () => {
      unlisten?.();
    };
  }, [store, openNew]);
}

export function EventListeners() {
  useUpdaterEvents();
  useNotificationEvents();

  return null;
}
