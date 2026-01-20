import { useQuery } from "@tanstack/react-query";
import { FolderIcon } from "lucide-react";

import { commands as settingsCommands } from "@hypr/plugin-settings";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";

export function SettingsLab() {
  const { data: basePath } = useQuery({
    queryKey: ["content-base-path"],
    queryFn: async () => {
      const result = await settingsCommands.contentBase();
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const handleOpenControlWindow = async () => {
    await windowsCommands.windowShow({ type: "control" });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-medium mb-1">Content Folder</h3>
          <p className="text-xs text-neutral-600">
            Where Hyprnote stores your data locally.
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="outline" disabled>
              Customize
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Coming soon</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center gap-3 border border-neutral-200 rounded-lg px-4 py-3">
        <FolderIcon className="size-4 text-neutral-500 shrink-0" />
        <span className="text-sm text-neutral-600 truncate">
          {basePath ?? "Loading..."}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 pt-4">
        <div className="flex-1">
          <h3 className="text-sm font-medium mb-1">Control Overlay</h3>
          <p className="text-xs text-neutral-600">
            Open a floating control window for quick access to recording
            controls. This window stays on top and can be used during meetings.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleOpenControlWindow}>
          Open
        </Button>
      </div>
    </div>
  );
}
