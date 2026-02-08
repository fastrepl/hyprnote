import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

import { useConfigValue } from "../config/use-config";

export function ThemeSync() {
  const theme = useConfigValue("theme");

  useEffect(() => {
    const root = document.documentElement;

    const apply = (mode: "light" | "dark") => {
      root.classList.toggle("dark", mode === "dark");
    };

    const applyTheme = async () => {
      if (theme === "system") {
        try {
          const nativeTheme = await invoke<string>("get_system_theme");
          apply(nativeTheme === "dark" ? "dark" : "light");
        } catch {
          apply("light");
        }
      } else {
        apply(theme);
      }
    };

    applyTheme();

    if (theme !== "system") {
      return;
    }

    let unlistenNative: (() => void) | undefined;

    listen<string>("system-theme-changed", (event) => {
      apply(event.payload === "dark" ? "dark" : "light");
    }).then((fn) => {
      unlistenNative = fn;
    });

    return () => {
      unlistenNative?.();
    };
  }, [theme]);

  return null;
}
