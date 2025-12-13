import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

import { useTabs } from "../store/zustand/tabs";

interface UpdatedPayload {
  previous: string;
  current: string;
}

export function ChangelogListener() {
  const openNew = useTabs((state) => state.openNew);

  useEffect(() => {
    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    const unlisten = listen<UpdatedPayload>("Updated", (event) => {
      const { current } = event.payload;
      openNew({
        type: "changelog",
        state: { version: current },
      });
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [openNew]);

  return null;
}
