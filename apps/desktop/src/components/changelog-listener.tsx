import { type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect } from "react";

import { events } from "@hypr/plugin-updater2";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

import { useTabs } from "../store/zustand/tabs";

export function ChangelogListener() {
  const openNew = useTabs((state) => state.openNew);

  useEffect(() => {
    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    let unlisten: null | UnlistenFn = null;
    void events.updatedEvent
      .listen(({ payload: { previous, current } }) => {
        openNew({
          type: "changelog",
          state: { previous, current },
        });
      })
      .then((f) => {
        unlisten = f;
      });

    return () => {
      unlisten?.();
      unlisten = null;
    };
  }, [openNew]);

  return null;
}
