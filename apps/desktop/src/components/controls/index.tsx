import { useEffect, useState } from "react";
import { type, type OsType } from "@tauri-apps/plugin-os";

import { MacOS } from "./macos";
import { Windows } from "./windows";

export default function Controls() {
  const [osType, setOsType] = useState<OsType | null>(null);

  useEffect(() => {
    try {
      const osType = type();
      setOsType(osType);
    } catch (_ignored) {}
  }, []);

  if (osType === "windows") {
    return <Windows />;
  }

  return <MacOS />;
}
