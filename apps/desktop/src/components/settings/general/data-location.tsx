import { open as selectDirectory } from "@tauri-apps/plugin-dialog";
import { FolderIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { commands as settingsCommands } from "@hypr/plugin-settings";
import { Button } from "@hypr/ui/components/ui/button";

import * as settings from "../../../store/tinybase/store/settings";

export function DataLocationView() {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const setPartialValues = settings.UI.useSetPartialValuesCallback(
    (row: { content_base?: string }) => row,
    [],
    settings.STORE_ID,
  );

  useEffect(() => {
    settingsCommands.getContentBase().then(setCurrentPath);
  }, []);

  const handleChangeLocation = async () => {
    setIsLoading(true);
    try {
      const selected = await selectDirectory({
        title: "Select Data Location",
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === "string") {
        setPartialValues({ content_base: selected });
        setCurrentPath(selected);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="font-semibold mb-4">Data Location</h2>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium mb-1">Content Storage Location</h3>
            <p className="text-xs text-neutral-600 mb-2">
              Choose where your sessions, chats, and recordings are stored.
            </p>
            <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-100 rounded px-2 py-1.5 overflow-hidden">
              <FolderIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate" title={currentPath}>
                {currentPath || "Loading..."}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleChangeLocation}
            disabled={isLoading}
          >
            {isLoading ? "Selecting..." : "Change"}
          </Button>
        </div>
        <p className="text-xs text-neutral-500">
          Note: Changing this location will not move existing data. You may need to restart the app for changes to take effect.
        </p>
      </div>
    </div>
  );
}
