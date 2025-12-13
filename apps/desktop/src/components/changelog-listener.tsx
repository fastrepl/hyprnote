import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

import { useTabs } from "../store/zustand/tabs";

export function ChangelogListener() {
  const openNew = useTabs((state) => state.openNew);

  useEffect(() => {
    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    const unlisten = listen<string>("show-changelog", (event) => {
      const version = event.payload;
      openNew({
        type: "changelog",
        state: { version },
      });
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [openNew]);

  return null;
}
